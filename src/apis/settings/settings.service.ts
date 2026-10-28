import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from 'src/common/crypto/crypto.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { PAYMENT_METHOD_KIND } from 'src/common/enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AppSetting } from './entities/app-setting.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import {
  AiSettingsDto,
  CompanySettingsDto,
  ExchangeRatesDto,
  InvoiceTemplateDto,
  PaymentMethodDto,
  TelegramSettingsDto,
} from './dto/settings.dto';

export const SETTING_KEYS = {
  company: 'company',
  invoiceTemplate: 'invoice-template',
  rates: 'exchange-rates',
  telegram: 'telegram',
  ai: 'ai',
} as const;

export const DEFAULT_TELEGRAM_TEMPLATE =
  '📢 Kính gửi {{customer}},\n\nInvoice {{invoice_code}} ({{period}}) với số tiền {{amount}} sẽ đến hạn vào {{due_date}}.\nVui lòng thanh toán vào:\n🏦 {{bank_info}}\n\nCảm ơn quý khách!';

const DEFAULTS = {
  [SETTING_KEYS.company]: {
    companyName: '',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
  },
  [SETTING_KEYS.invoiceTemplate]: {
    title: 'HÓA ĐƠN',
    orientation: 'landscape',
    accentColor: '#333333',
    showCompany: true,
    showLogo: true,
    showCustomer: true,
    showPayment: true,
    showQr: true,
    showSignature: false,
    signatureLeft: 'Người mua hàng',
    signatureRight: 'Người lập hóa đơn',
    footerNote: '',
  },
  [SETTING_KEYS.rates]: { USD: 25400, USDT: 25500 },
  [SETTING_KEYS.telegram]: {
    botToken: '',
    botUsername: '',
    enabled: false,
    remindDaysBefore: 3,
    autoSendInvoice: false,
    template: DEFAULT_TELEGRAM_TEMPLATE,
  },
  [SETTING_KEYS.ai]: {
    provider: 'gemini',
    geminiApiKey: '',
    model: 'gemini-2.0-flash' as string,
    enableQuotationAssist: false,
    enableChatAssistant: false,
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
    lastCheckedAt: '',
  },
} as const;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting) private readonly settings: Repository<AppSetting>,
    private readonly paymentMethods: PaymentMethodRepository,
    private readonly crypto: CryptoService,
    private readonly audit: AuditLogsService,
  ) {}

  /* ---------- generic JSON documents ---------- */

  async read<T = any>(key: string): Promise<T> {
    const row = await this.settings.findOne({ where: { key } });
    return { ...(DEFAULTS[key] ?? {}), ...(row?.value ?? {}) } as T;
  }

  private async write(key: string, value: Record<string, any>) {
    await this.settings.save({ key, value });
    return value;
  }

  /** Creates missing documents so GET never has to fall back (called by the seeder) */
  async ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (!(await this.settings.exist({ where: { key } }))) await this.settings.save({ key, value: value as any });
    }
  }

  /* ---------- company / invoice template / rates ---------- */

  company() {
    return this.read(SETTING_KEYS.company);
  }

  async saveCompany(dto: CompanySettingsDto, actor: AuthUser) {
    const saved = await this.write(SETTING_KEYS.company, { ...dto });
    await this.audit.log(actor, 'Cập nhật thông tin công ty', dto.companyName);
    return saved;
  }

  invoiceTemplate() {
    return this.read(SETTING_KEYS.invoiceTemplate);
  }

  async saveInvoiceTemplate(dto: InvoiceTemplateDto, actor: AuthUser) {
    const saved = await this.write(SETTING_KEYS.invoiceTemplate, { ...dto });
    await this.audit.log(actor, 'Cập nhật mẫu hóa đơn', dto.title);
    return saved;
  }

  rates() {
    return this.read(SETTING_KEYS.rates);
  }

  async saveRates(dto: ExchangeRatesDto, actor: AuthUser) {
    const saved = await this.write(SETTING_KEYS.rates, { ...dto });
    await this.audit.log(actor, 'Cập nhật tỷ giá', `USD ${dto.USD} · USDT ${dto.USDT}`);
    return saved;
  }

  /* ---------- secrets (telegram bot token, Gemini API key) ---------- */

  async telegram() {
    const stored = await this.read<any>(SETTING_KEYS.telegram);
    return { ...stored, botToken: this.crypto.mask(this.crypto.decrypt(stored.botToken)) };
  }

  /** Decrypted settings for server-side use only; never returned over HTTP */
  async telegramSecret() {
    const stored = await this.read<any>(SETTING_KEYS.telegram);
    return { ...stored, botToken: this.crypto.decrypt(stored.botToken) } as typeof DEFAULTS.telegram & { botToken: string };
  }

  async saveTelegram(dto: TelegramSettingsDto, actor: AuthUser) {
    const current = await this.read<any>(SETTING_KEYS.telegram);
    const botToken = this.crypto.isMasked(dto.botToken) ? current.botToken : this.crypto.encrypt(dto.botToken.trim());
    await this.write(SETTING_KEYS.telegram, { ...dto, botToken });
    await this.audit.log(actor, 'Cập nhật cấu hình Telegram', dto.botUsername || '—');
    return this.telegram();
  }

  /**
   * `reveal=false` hides even the tail of the key. Non-admins only need to know
   * whether a key exists (to enable the assistant UI), not any part of it.
   */
  async ai(reveal = true) {
    const stored = await this.read<any>(SETTING_KEYS.ai);
    const key = this.crypto.decrypt(stored.geminiApiKey);
    const masked = !key ? '' : reveal ? this.crypto.mask(key) : '•'.repeat(8);
    return { ...stored, geminiApiKey: masked };
  }

  async aiSecret() {
    const stored = await this.read<any>(SETTING_KEYS.ai);
    return { ...stored, geminiApiKey: this.crypto.decrypt(stored.geminiApiKey) } as typeof DEFAULTS.ai & { geminiApiKey: string };
  }

  async saveAi(dto: AiSettingsDto, actor: AuthUser) {
    const current = await this.read<any>(SETTING_KEYS.ai);
    const geminiApiKey = this.crypto.isMasked(dto.geminiApiKey) ? current.geminiApiKey : this.crypto.encrypt(dto.geminiApiKey.trim());
    await this.write(SETTING_KEYS.ai, { ...dto, geminiApiKey });
    await this.audit.log(actor, 'Cập nhật cấu hình AI', dto.model);
    return this.ai();
  }

  /* ---------- payment methods ---------- */

  listPaymentMethods() {
    return this.paymentMethods.find({ options: { order: { createdAt: 'ASC' } } });
  }

  private normalizeMethod(dto: PaymentMethodDto): Partial<PaymentMethod> {
    const crypto = dto.kind === PAYMENT_METHOD_KIND.CRYPTO;
    return {
      ...dto,
      holder: crypto ? undefined : dto.holder,
      network: crypto ? dto.network : undefined,
      rate: crypto ? dto.rate : undefined,
      currencies: [...new Set(dto.currencies)],
    };
  }

  async createPaymentMethod(dto: PaymentMethodDto, actor: AuthUser) {
    const created = await this.paymentMethods.create(this.normalizeMethod(dto));
    await this.audit.log(actor, 'Thêm phương thức thanh toán', created.name);
    return created;
  }

  async updatePaymentMethod(id: string, dto: PaymentMethodDto, actor: AuthUser) {
    await this.paymentMethods.findByIdOrFail(id);
    const updated = await this.paymentMethods.updateByIdOrFail(id, this.normalizeMethod(dto) as any);
    await this.audit.log(actor, 'Sửa phương thức thanh toán', updated.name);
    return updated;
  }

  async removePaymentMethod(id: string, actor: AuthUser) {
    const removed = await this.paymentMethods.softDelete(id);
    if (!removed) throw new NotFoundException('Không tìm thấy phương thức thanh toán');
    await this.audit.log(actor, 'Xóa phương thức thanh toán', removed.name);
  }
}
