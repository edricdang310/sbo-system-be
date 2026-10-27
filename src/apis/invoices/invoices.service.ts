import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { SequenceService } from 'src/common/sequence/sequence.service';
import { StorageService } from 'src/common/storage/storage.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { BILLING_CYCLE, CYCLE_LABEL, CYCLE_MONTHS, INVOICE_STATUS, SERVICE_CHANGE_KIND, SERVICE_STATUS } from 'src/common/enum';
import { addDays, addMonths, assertIsoDate, formatDateVi, maxDate, todayIso } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { ContractsService } from '../contracts/contracts.service';
import { TelegramService } from '../telegram/telegram.service';
import { Invoice, InvoiceLine } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment, PaymentAttachment } from './entities/payment.entity';
import { InvoiceRepository } from './repositories/invoice.repository';
import { AttachmentDto, CreateInvoiceDto, CreatePaymentDto, SendTelegramDto, SettleInvoiceDto } from './dto/invoice.dto';

const FULL = { relations: { items: true, payments: true }, order: { items: { from: 'ASC' }, payments: { paidAt: 'ASC', createdAt: 'ASC' } } } as const;

/** Keep in sync with sbo-fe/src/lib/billing.ts: a stopped service is charged only if it ran longer than this */
const MIN_BILLABLE_DAYS = 3;

export const invoiceTotal = (lines: InvoiceLine[]) => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
const identOf = (config: Record<string, string> = {}) => config.IP || config.Domain || config.Bucket || config.Endpoint || '';

@Injectable()
export class InvoicesService extends BaseServiceAbstract<Invoice> implements OnApplicationBootstrap {
  protected readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly dataSource: DataSource,
    private readonly sequence: SequenceService,
    private readonly storage: StorageService,
    private readonly audit: AuditLogsService,
    private readonly contractsService: ContractsService,
    private readonly telegram: TelegramService,
  ) {
    super(invoices);
  }

  list() {
    return this.guard(() =>
      this.invoices.find({ options: { ...FULL, order: { issueDate: 'DESC', createdAt: 'DESC', items: { from: 'ASC' } } } as any }),
    );
  }

  get(id: string, manager: EntityManager = this.dataSource.manager) {
    return this.guard(async () => {
      const invoice = await manager.findOne(Invoice, { where: { id }, ...FULL } as any);
      if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn');
      return invoice;
    });
  }

  /**
   * Issue an invoice. The client only chooses services/cycles; period, amount and snapshot are
   * recomputed from the stored service so prices and paidUntil can't be forged from the browser.
   */
  createInvoice(dto: CreateInvoiceDto, actor: AuthUser) {
    return this.guard(async () => {
      assertIsoDate(dto.issueDate, 'Ngày phát hành');
      assertIsoDate(dto.dueDate, 'Hạn thanh toán');
      if (dto.dueDate < dto.issueDate) throw new BadRequestException('Hạn thanh toán không được trước ngày phát hành');
      if (new Set(dto.items.map((i) => i.serviceId)).size !== dto.items.length) {
        throw new BadRequestException('Một dịch vụ chỉ xuất hiện một lần trong hóa đơn');
      }

      const invoiceId = await this.dataSource.transaction(async (m) => {
        const contract = await m.findOne(Contract, { where: { id: dto.contractId }, relations: { services: true } });
        if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');

        const lines: InvoiceLine[] = [];
        const items: Partial<InvoiceItem>[] = [];
        for (const input of dto.items) {
          const service = contract.services.find((s) => s.id === input.serviceId);
          if (!service) throw new BadRequestException('Dịch vụ không thuộc hợp đồng này');
          const item = await this.buildItem(m, contract, service, input, dto.periodFrom);
          items.push(item);
          lines.push({
            description: `${item.name}${item.ident ? ` (${item.ident})` : ''} · ${formatDateVi(item.from)} → ${formatDateVi(item.to)}`,
            quantity: item.quantity * item.months,
            unitPrice: item.unitPrice,
          });
        }

        const invoice = await m.save(
          Invoice,
          m.create(Invoice, {
            code: await this.sequence.invoiceCode(),
            customerId: contract.customerId,
            contractId: contract.id,
            period: dto.period,
            periodFrom: dto.periodFrom,
            periodTo: dto.periodTo,
            issueDate: dto.issueDate,
            dueDate: dto.dueDate,
            status: dto.dueDate < todayIso() ? INVOICE_STATUS.OVERDUE : INVOICE_STATUS.UNPAID,
            lines,
            createdBy: actor.name,
          }),
        );
        await m.save(InvoiceItem, items.map((i) => m.create(InvoiceItem, { ...i, invoiceId: invoice.id })));
        await this.audit.log(actor, 'Tạo hóa đơn', `${invoice.code} · ${contract.code}`);
        return invoice.id;
      });

      this.telegram.autoSendInvoice(invoiceId).catch((e) => this.logger.warn(`Auto-send failed: ${e.message}`));
      return this.get(invoiceId);
    });
  }

  private async buildItem(
    m: EntityManager,
    contract: Contract,
    service: ServiceItem,
    input: { from?: string; cycles?: number; months?: number },
    periodFrom?: string,
  ): Promise<Partial<InvoiceItem>> {
    if (service.status === SERVICE_STATUS.STOPPED && !service.stopDate) {
      throw new BadRequestException(`Dịch vụ "${service.name}" đã dừng`);
    }
    // Stopped after at most MIN_BILLABLE_DAYS: most likely created by mistake, so it is never charged
    if (service.status === SERVICE_STATUS.STOPPED && service.startDate && service.stopDate) {
      const used = Math.round((Date.parse(service.stopDate) - Date.parse(service.startDate)) / 86400000);
      if (used <= MIN_BILLABLE_DAYS) {
        throw new BadRequestException(`Dịch vụ "${service.name}" chỉ dùng ${used} ngày (≤ ${MIN_BILLABLE_DAYS} ngày) nên không tính phí`);
      }
    }
    const cycle: BILLING_CYCLE = service.billingCycle ?? contract.billingCycle;
    const cycleMonths = CYCLE_MONTHS[cycle];

    const nextStart = service.paidUntil ? addDays(service.paidUntil, 1) : service.startDate ?? periodFrom ?? todayIso();
    const from = input.from ?? nextStart;
    if (from < nextStart) {
      throw new BadRequestException(`Dịch vụ "${service.name}" đã thanh toán đến ${formatDateVi(service.paidUntil)}`);
    }

    let cycles = input.cycles ?? 1;
    if (!input.cycles && input.months) {
      if (input.months % cycleMonths !== 0) {
        throw new BadRequestException(`Số tháng của "${service.name}" phải là bội số của chu kỳ (${cycleMonths} tháng)`);
      }
      cycles = input.months / cycleMonths;
    }
    const months = cycleMonths * cycles;
    const to = addDays(addMonths(from, months), -1);

    const overlap = await m
      .createQueryBuilder(InvoiceItem, 'it')
      .innerJoin('it.invoice', 'inv')
      .where('it.serviceId = :sid', { sid: service.id })
      .andWhere('inv.status <> :cancelled', { cancelled: INVOICE_STATUS.CANCELLED })
      .andWhere('it.from <= :to AND it.to >= :from', { from, to })
      .getCount();
    if (overlap > 0) {
      throw new ConflictException(`Dịch vụ "${service.name}" đã có hóa đơn cho kỳ ${formatDateVi(from)} → ${formatDateVi(to)}`);
    }

    return {
      serviceId: service.id,
      name: service.name,
      ident: identOf(service.config) || undefined,
      from,
      to,
      months,
      quantity: service.quantity,
      unitPrice: service.unitPrice,
      amount: service.unitPrice * service.quantity * months,
      serviceType: service.type,
      config: { ...service.config },
      cycles,
      cycleLabel: CYCLE_LABEL[cycle],
    };
  }

  cancel(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const invoice = await this.get(id);
      if (invoice.status === INVOICE_STATUS.CANCELLED) throw new BadRequestException('Hóa đơn đã bị hủy');
      if (invoice.status === INVOICE_STATUS.PAID || invoice.applied || invoice.payments.length > 0) {
        throw new ConflictException('Hóa đơn đã có thanh toán nên không thể hủy');
      }
      await this.invoices.updateByIdOrFail(id, { status: INVOICE_STATUS.CANCELLED });
      await this.audit.log(actor, 'Hủy hóa đơn', invoice.code);
      return this.get(id);
    });
  }

  /**
   * Admin only (enforced by the controller). Soft-deletes the invoice with its items and payments.
   * If it had already renewed services, their paidUntil is recomputed from the remaining paid invoices.
   */
  remove(id: string, actor: AuthUser) {
    return this.guard(async () => {
      await this.dataSource.transaction(async (m) => {
        const invoice = await m.findOne(Invoice, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn');
        const items = await m.find(InvoiceItem, { where: { invoiceId: id } });

        await m.softDelete(Payment, { invoiceId: id });
        await m.softDelete(InvoiceItem, { invoiceId: id });
        await m.softDelete(Invoice, id);

        if (invoice.applied) {
          for (const item of items) {
            const service = await m.findOne(ServiceItem, { where: { id: item.serviceId } });
            if (!service) continue;
            const remaining = await m
              .createQueryBuilder(InvoiceItem, 'it')
              .innerJoin('it.invoice', 'inv')
              .where('it.serviceId = :sid AND inv.applied = true', { sid: service.id })
              .getMany();
            const after = remaining.reduce<string | null>((max, r) => (!max || r.to > max ? r.to : max), null);
            const before = service.paidUntil ?? '';
            if ((after ?? '') === before) continue;
            await m.update(ServiceItem, service.id, { paidUntil: after });
            await this.contractsService.addHistory(
              m,
              service.id,
              SERVICE_CHANGE_KIND.UPDATED,
              [{ field: 'Đã trả đến', before, after: after ?? '' }],
              actor.name,
              `Xóa hóa đơn ${invoice.code}`,
            );
          }
        }
        await this.audit.log(actor, 'Xóa hóa đơn', invoice.code);
      });
    });
  }

  addPayment(id: string, dto: CreatePaymentDto, actor: AuthUser) {
    return this.guard(async () => {
      assertIsoDate(dto.paidAt, 'Ngày thanh toán');
      const attachments = await this.saveFiles(dto.attachments ?? []);
      const receiptUrl = await this.sanitizeReceiptUrl(dto.receiptUrl);

      try {
        await this.dataSource.transaction(async (m) => {
          // Row lock serialises concurrent payments so "applied" can only flip once
          const locked = await m.findOne(Invoice, { where: { id }, lock: { mode: 'pessimistic_write' } });
          if (!locked) throw new NotFoundException('Không tìm thấy hóa đơn');
          if (locked.status === INVOICE_STATUS.CANCELLED) throw new BadRequestException('Hóa đơn đã bị hủy');
          if (locked.status === INVOICE_STATUS.PAID) throw new BadRequestException('Hóa đơn đã được thanh toán đủ');

          await m.save(
            Payment,
            m.create(Payment, {
              invoiceId: id,
              paidAt: dto.paidAt,
              amount: dto.amount,
              currency: dto.currency && dto.originalAmount ? dto.currency : 'VND',
              originalAmount: dto.currency && dto.currency !== 'VND' ? dto.originalAmount ?? null : null,
              rate: dto.currency && dto.currency !== 'VND' ? dto.rate ?? null : null,
              bank: dto.bank ?? '',
              transactionCode: dto.transactionCode ?? '',
              receiptUrl,
              methodName: dto.methodName,
              note: dto.note,
              attachments,
              recordedBy: actor.name,
            }),
          );

          const { sum } = await m
            .createQueryBuilder(Payment, 'p')
            .select('COALESCE(SUM(p.amount), 0)', 'sum')
            .where('p.invoiceId = :id', { id })
            .getRawOne();
          // Cent-level tolerance so decimal amounts don't leave an invoice stuck at "unpaid"
          if (Number(sum) + 0.005 >= invoiceTotal(locked.lines)) {
            await m.update(Invoice, id, { status: INVOICE_STATUS.PAID });
            if (!locked.applied) await this.applyToServices(m, locked, actor);
          }
          await this.audit.log(actor, 'Ghi nhận thanh toán', `${locked.code} · ${new Intl.NumberFormat('vi-VN').format(dto.amount)}`);
        });
      } catch (error) {
        await Promise.all(attachments.map((a) => this.storage.remove(a.url)));
        throw error;
      }
      return this.get(id);
    });
  }

  /**
   * Mark an under-paid invoice as fully paid (e.g. the amount differs slightly because of the exchange rate).
   * Requires at least one recorded payment; the shortfall is kept in the audit log.
   */
  settle(id: string, dto: SettleInvoiceDto, actor: AuthUser) {
    return this.guard(async () => {
      await this.dataSource.transaction(async (m) => {
        const locked = await m.findOne(Invoice, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!locked) throw new NotFoundException('Không tìm thấy hóa đơn');
        if (locked.status === INVOICE_STATUS.CANCELLED) throw new BadRequestException('Hóa đơn đã bị hủy');
        if (locked.status === INVOICE_STATUS.PAID) throw new BadRequestException('Hóa đơn đã được thanh toán đủ');
        const { sum, count } = await m
          .createQueryBuilder(Payment, 'p')
          .select('COALESCE(SUM(p.amount), 0)', 'sum')
          .addSelect('COUNT(*)', 'count')
          .where('p.invoiceId = :id', { id })
          .getRawOne();
        if (Number(count) === 0) throw new BadRequestException('Cần ghi nhận ít nhất một khoản thanh toán trước khi xác nhận hoàn tất');
        const shortfall = invoiceTotal(locked.lines) - Number(sum);
        await m.update(Invoice, id, { status: INVOICE_STATUS.PAID });
        if (!locked.applied) await this.applyToServices(m, locked, actor);
        const note = dto.note?.trim() ? ` · ${dto.note.trim()}` : '';
        await this.audit.log(
          actor,
          'Xác nhận thanh toán hoàn tất (chênh lệch)',
          `${locked.code} · thiếu ${new Intl.NumberFormat('vi-VN').format(Math.round(shortfall * 100) / 100)}${note}`,
        );
      });
      return this.get(id);
    });
  }


  /** First time an invoice is fully paid: advance each service's paidUntil and log a "renewed" entry */
  private async applyToServices(m: EntityManager, invoice: Invoice, actor: AuthUser) {
    const items = await m.find(InvoiceItem, { where: { invoiceId: invoice.id } });
    for (const item of items) {
      const service = await m.findOne(ServiceItem, { where: { id: item.serviceId } });
      if (!service) continue;
      const before = service.paidUntil ?? '';
      const after = maxDate(service.paidUntil, item.to) ?? '';
      if (after !== before) await m.update(ServiceItem, service.id, { paidUntil: after });
      await this.contractsService.addHistory(
        m,
        service.id,
        SERVICE_CHANGE_KIND.RENEWED,
        [{ field: 'Đã trả đến', before, after }],
        actor.name,
        `Hóa đơn ${invoice.code} đã thanh toán (${formatDateVi(item.from)} → ${formatDateVi(item.to)})`,
      );
    }
    await m.update(Invoice, invoice.id, { applied: true });
  }

  addPaymentFiles(invoiceId: string, paymentId: string, files: AttachmentDto[], actor: AuthUser) {
    return this.guard(async () => {
      const payment = await this.findPayment(invoiceId, paymentId);
      if ((payment.attachments?.length ?? 0) + files.length > 10) {
        throw new BadRequestException('Mỗi khoản thanh toán tối đa 10 tệp đính kèm');
      }
      const saved = await this.saveFiles(files);
      await this.dataSource.getRepository(Payment).update(paymentId, { attachments: [...(payment.attachments ?? []), ...saved] });
      await this.audit.log(actor, 'Thêm chứng từ thanh toán', `${payment.transactionCode || paymentId}`);
      return this.get(invoiceId);
    });
  }

  removePaymentFile(invoiceId: string, paymentId: string, index: number, actor: AuthUser) {
    return this.guard(async () => {
      const payment = await this.findPayment(invoiceId, paymentId);
      const files = payment.attachments ?? [];
      if (!Number.isInteger(index) || index < 0 || index >= files.length) throw new NotFoundException('Không tìm thấy tệp đính kèm');
      const [removed] = files.splice(index, 1);
      await this.dataSource.getRepository(Payment).update(paymentId, { attachments: files });
      await this.storage.remove(removed.url);
      await this.audit.log(actor, 'Xóa chứng từ thanh toán', `${payment.transactionCode || paymentId} · ${removed.name}`);
      return this.get(invoiceId);
    });
  }

  async sendTelegram(id: string, dto: SendTelegramDto, actor: AuthUser) {
    return this.guard(async () => {
      const invoice = await this.get(id);
      await this.telegram.sendInvoice(id, { message: dto.message, attachQr: dto.attachQr });
      await this.audit.log(actor, 'Gửi hóa đơn qua Telegram', invoice.code);
    });
  }

  private async findPayment(invoiceId: string, paymentId: string) {
    const payment = await this.dataSource.getRepository(Payment).findOne({ where: { id: paymentId, invoiceId } });
    if (!payment) throw new NotFoundException('Không tìm thấy khoản thanh toán');
    return payment;
  }

  private saveFiles(files: AttachmentDto[]): Promise<PaymentAttachment[]> {
    return Promise.all(files.map((f) => this.storage.saveAttachment(f)));
  }

  /** receiptUrl may be a data URL (stored on disk) or a plain http(s) link; anything else is dropped */
  private async sanitizeReceiptUrl(url?: string): Promise<string | undefined> {
    if (!url) return undefined;
    if (url.startsWith('data:')) return (await this.storage.saveAttachment({ name: 'receipt', url })).url;
    if (/^https?:\/\//i.test(url)) return url.slice(0, 2000);
    throw new BadRequestException('Liên kết biên lai không hợp lệ');
  }

  /* ---- scheduled job ---- */

  async onApplicationBootstrap() {
    await this.markOverdue().catch((e) => this.logger.warn(`Initial overdue sweep failed: ${e.message}`));
  }

  /** unpaid → overdue once dueDate has passed (business timezone) */
  @Cron('5 0 * * *', { timeZone: process.env.TIME_ZONE ?? 'Asia/Ho_Chi_Minh' })
  async markOverdue() {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: INVOICE_STATUS.OVERDUE })
      .where('status = :s AND due_date < :today', { s: INVOICE_STATUS.UNPAID, today: todayIso() })
      .execute();
    if (result.affected) {
      this.logger.log(`Marked ${result.affected} invoice(s) as overdue`);
      await this.audit.log('Hệ thống', 'Chuyển hóa đơn quá hạn', `${result.affected} hóa đơn`);
    }
    return result.affected ?? 0;
  }
}
