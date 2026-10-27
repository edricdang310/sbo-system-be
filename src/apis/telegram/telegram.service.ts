import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In } from 'typeorm';
import { INVOICE_STATUS, PAYMENT_METHOD_KIND, SERVICE_STATUS } from 'src/common/enum';
import { addDays, daysBetween, formatDateVi, formatVnd, todayIso } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { SettingsService } from '../settings/settings.service';

const TZ = process.env.TIME_ZONE ?? 'Asia/Ho_Chi_Minh';
const BOT_ACTOR = 'Bot Telegram';

interface TgUpdate {
  update_id: number;
  message?: { chat: { id: number; type: string }; from?: { username?: string; first_name?: string }; text?: string };
}

const invoiceTotal = (inv: Invoice) => inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
const paidSum = (inv: Invoice) => (inv.payments ?? []).reduce((s, p) => s + p.amount, 0);
const normUser = (u?: string | null) => (u ?? '').trim().replace(/^@/, '').toLowerCase();

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private offset = 0;
  private polling = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
    private readonly audit: AuditLogsService,
  ) {}

  /* ---------- Bot API ---------- */

  private async call<T = any>(token: string, method: string, body?: BodyInit | Record<string, unknown>): Promise<T> {
    const isForm = body instanceof FormData;
    let res: Response;
    try {
      res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: isForm ? undefined : { 'Content-Type': 'application/json' },
        body: isForm ? (body as FormData) : JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // The error message of fetch can contain the URL (and therefore the token), so it is never propagated
      throw new BadGatewayException('Không kết nối được tới Telegram');
    }
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new BadGatewayException(`Telegram: ${json.description ?? res.status}`);
    return json.result as T;
  }

  private async ready() {
    const cfg = await this.settings.telegramSecret();
    if (!cfg.enabled || !cfg.botToken) throw new BadRequestException('Chatbot Telegram chưa được bật hoặc chưa cấu hình token');
    return cfg;
  }

  private render(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
  }

  private async bankInfo() {
    const methods = (await this.settings.listPaymentMethods()).filter((m) => m.active && m.kind === PAYMENT_METHOD_KIND.BANK);
    if (methods.length) return methods.map((m) => [m.name, m.account, m.holder].filter(Boolean).join(' · ')).join('\n🏦 ');
    const c: any = await this.settings.company();
    return [c.bankName, c.bankAccount, c.bankHolder].filter(Boolean).join(' · ');
  }

  private async invoiceVars(inv: Invoice, customer: Customer) {
    return {
      customer: customer.name,
      invoice_code: inv.code,
      period: inv.period,
      amount: formatVnd(Math.max(invoiceTotal(inv) - paidSum(inv), 0)),
      due_date: formatDateVi(inv.dueDate),
      bank_info: await this.bankInfo(),
    };
  }

  private async loadInvoice(id: string) {
    const inv = await this.dataSource.getRepository(Invoice).findOne({ where: { id }, relations: { payments: true } });
    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    const customer = await this.dataSource.getRepository(Customer).findOne({ where: { id: inv.customerId } });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return { inv, customer };
  }

  /* ---------- outgoing messages ---------- */

  /** Sends the invoice message (custom text or the configured template) to the customer's linked chat */
  async sendInvoice(invoiceId: string, opts: { message?: string; attachQr?: boolean } = {}, by = BOT_ACTOR) {
    const cfg = await this.ready();
    const { inv, customer } = await this.loadInvoice(invoiceId);
    if (!customer.telegramChatId) {
      throw new BadRequestException(`Khách hàng "${customer.name}" chưa liên kết Telegram (thiếu chatId)`);
    }
    const text = (opts.message?.trim() || this.render(cfg.template, await this.invoiceVars(inv, customer))).slice(0, 4000);
    await this.call(cfg.botToken, 'sendMessage', { chat_id: customer.telegramChatId, text });
    if (opts.attachQr) await this.sendQr(cfg.botToken, customer.telegramChatId).catch((e) => this.logger.warn(`QR not sent: ${e.message}`));

    await this.dataSource.getRepository(Invoice).update(invoiceId, { telegramSent: true });
    await this.audit.log(by, 'Gửi nhắc cước', `${customer.telegramUsername ?? customer.name} · ${inv.code}`);
  }

  private async sendQr(token: string, chatId: string) {
    const methods = await this.settings.listPaymentMethods();
    const qr = methods.find((m) => m.active && m.qrUrl?.startsWith('data:image/'));
    if (!qr) return;
    const [, mime, b64] = /^data:(image\/[\w+.-]+);base64,(.+)$/s.exec(qr.qrUrl) ?? [];
    if (!b64) return;
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', `${qr.name} · ${qr.account}`);
    form.append('photo', new Blob([Buffer.from(b64, 'base64')], { type: mime }), 'qr.png');
    await this.call(token, 'sendPhoto', form);
  }

  /** Sends right after an invoice is issued when "autoSendInvoice" is on; silently skips when it cannot */
  async autoSendInvoice(invoiceId: string) {
    const cfg = await this.settings.telegramSecret();
    if (!cfg.enabled || !cfg.autoSendInvoice || !cfg.botToken) return;
    const { customer } = await this.loadInvoice(invoiceId);
    if (!customer.telegramChatId) return;
    await this.sendInvoice(invoiceId);
  }

  /* ---------- scheduled reminders ---------- */

  /**
   * Daily 09:00: remind N days before the due date, on the due date, and weekly while overdue.
   * Also warns about services expiring in N days.
   */
  @Cron('0 9 * * *', { timeZone: TZ })
  async runReminders() {
    const cfg = await this.settings.telegramSecret();
    if (!cfg.enabled || !cfg.botToken) return;
    const today = todayIso();
    const n = cfg.remindDaysBefore;

    const invoices = await this.dataSource.getRepository(Invoice).find({
      where: { status: In([INVOICE_STATUS.UNPAID, INVOICE_STATUS.OVERDUE]) },
      relations: { payments: true },
    });
    let sent = 0;
    for (const inv of invoices) {
      const diff = daysBetween(today, inv.dueDate); // >0 upcoming, 0 today, <0 overdue
      const due = (n > 0 && diff === n) || diff === 0 || (diff < 0 && Math.abs(diff) % 7 === 0);
      if (!due) continue;
      try {
        const customer = await this.dataSource.getRepository(Customer).findOne({ where: { id: inv.customerId } });
        if (!customer?.telegramChatId) continue;
        const text = this.render(cfg.template, await this.invoiceVars(inv, customer));
        await this.call(cfg.botToken, 'sendMessage', { chat_id: customer.telegramChatId, text });
        await this.audit.log(BOT_ACTOR, 'Gửi nhắc cước', `${customer.telegramUsername ?? customer.name} · ${inv.code}`);
        sent++;
      } catch (e) {
        this.logger.warn(`Reminder for ${inv.code} failed: ${(e as Error).message}`);
      }
    }

    const expiring = await this.dataSource.getRepository(ServiceItem).find({
      where: { status: SERVICE_STATUS.ACTIVE, endDate: addDays(today, n) },
    });
    for (const s of expiring) {
      try {
        const contract = await this.dataSource.getRepository(Contract).findOne({ where: { id: s.contractId } });
        const customer = contract && (await this.dataSource.getRepository(Customer).findOne({ where: { id: contract.customerId } }));
        if (!customer?.telegramChatId) continue;
        const text = `⏰ Kính gửi ${customer.name},\n\nDịch vụ "${s.name}" (hợp đồng ${contract.code}) sẽ hết hạn vào ${formatDateVi(s.endDate)}. Vui lòng liên hệ để gia hạn.\n\nCảm ơn quý khách!`;
        await this.call(cfg.botToken, 'sendMessage', { chat_id: customer.telegramChatId, text });
        sent++;
      } catch (e) {
        this.logger.warn(`Expiry reminder for ${s.name} failed: ${(e as Error).message}`);
      }
    }
    if (sent) this.logger.log(`Sent ${sent} Telegram reminder(s)`);
  }

  /* ---------- incoming commands (long polling) ---------- */

  @Cron('*/10 * * * * *')
  async pollUpdates() {
    if (this.polling) return;
    this.polling = true;
    try {
      const cfg = await this.settings.telegramSecret();
      if (!cfg.enabled || !cfg.botToken) return;
      const updates = await this.call<TgUpdate[]>(cfg.botToken, 'getUpdates', {
        offset: this.offset,
        timeout: 0,
        allowed_updates: ['message'],
      });
      for (const u of updates) {
        this.offset = u.update_id + 1;
        await this.handleUpdate(cfg.botToken, u).catch((e) => this.logger.warn(`Update ${u.update_id} failed: ${e.message}`));
      }
    } catch (e) {
      this.logger.debug(`Polling skipped: ${(e as Error).message}`);
    } finally {
      this.polling = false;
    }
  }

  private async handleUpdate(token: string, update: TgUpdate) {
    const msg = update.message;
    if (!msg?.text || msg.chat.type !== 'private') return;
    const chatId = String(msg.chat.id);
    const command = msg.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();
    const reply = (text: string) => this.call(token, 'sendMessage', { chat_id: chatId, text });
    const customers = this.dataSource.getRepository(Customer);

    if (command === '/start' || command === '/link') {
      const username = normUser(msg.from?.username);
      if (!username) return reply('Tài khoản Telegram của bạn chưa có username. Vui lòng đặt username trong phần Cài đặt Telegram rồi gửi lại /start.');
      const linkedHere = await customers.findOne({ where: { telegramChatId: chatId } });
      if (linkedHere) return reply(`Bạn đã được liên kết với "${linkedHere.name}". Gửi /invoices để xem hóa đơn chưa thanh toán.`);

      const candidates = await customers.createQueryBuilder('c').where("LOWER(REPLACE(c.telegramUsername, '@', '')) = :u", { u: username }).getMany();
      const match = candidates.find((c) => !c.telegramChatId);
      if (!match) {
        return reply(
          candidates.length
            ? 'Tài khoản này đã được liên kết với một chat khác. Vui lòng liên hệ nhân viên để được hỗ trợ.'
            : `Chưa tìm thấy khách hàng với username @${username}. Vui lòng liên hệ nhân viên để cập nhật thông tin.`,
        );
      }
      await customers.update(match.id, { telegramChatId: chatId });
      await this.audit.log(BOT_ACTOR, 'Liên kết Telegram', `@${username} · ${match.name}`);
      return reply(`Đã liên kết thành công với "${match.name}". Bạn sẽ nhận thông báo hóa đơn và nhắc cước tại đây.`);
    }

    if (command === '/invoices') {
      const customer = await customers.findOne({ where: { telegramChatId: chatId } });
      if (!customer) return reply('Bạn chưa được liên kết. Gửi /start để liên kết tài khoản.');
      const open = await this.dataSource.getRepository(Invoice).find({
        where: { customerId: customer.id, status: In([INVOICE_STATUS.UNPAID, INVOICE_STATUS.OVERDUE]) },
        relations: { payments: true },
        order: { dueDate: 'ASC' },
        take: 20,
      });
      if (!open.length) return reply('Bạn không có hóa đơn nào chưa thanh toán. 🎉');
      return reply(
        open
          .map((i) => `• ${i.code} (${i.period}): ${formatVnd(invoiceTotal(i) - paidSum(i))} · hạn ${formatDateVi(i.dueDate)}${i.status === INVOICE_STATUS.OVERDUE ? ' ⚠️ quá hạn' : ''}`)
          .join('\n'),
      );
    }

    return reply('Lệnh hỗ trợ:\n/start — liên kết tài khoản\n/invoices — hóa đơn chưa thanh toán');
  }
}
