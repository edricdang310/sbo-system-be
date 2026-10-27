import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { AppSetting } from '../settings/entities/app-setting.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { softDeleteContracts } from '../contracts/contract-cascade';
import { Contact } from '../customers/entities/contact.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AutoDeleteRuleDto } from './dto/maintenance.dto';

export const CATEGORIES = ['customers', 'contracts', 'services', 'invoices', 'quotations', 'tickets', 'audit-logs'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Unit = 'day' | 'week' | 'month' | 'year';

export interface AutoDeleteRule {
  category: Category;
  enabled: boolean;
  /** How often the clean-up job runs for this category */
  everyValue: number;
  everyUnit: Unit;
  /** Only records created more than this long ago are eligible */
  olderValue: number;
  olderUnit: Unit;
  /** Only records in one of these statuses are eligible (empty / n.a. for categories without status) */
  statuses: string[];
  lastRunAt: string | null;
  lastDeleted: number | null;
}

/** Categories that can be auto-deleted, with the statuses a rule may target */
export const AUTO_DELETE_STATUSES: Partial<Record<Category, string[]>> = {
  invoices: ['unpaid', 'paid', 'overdue', 'cancelled'],
  contracts: ['draft', 'expired', 'terminated'],
  customers: ['inactive'],
  quotations: ['draft', 'sent', 'accepted', 'rejected'],
  tickets: ['open', 'in_progress', 'waiting', 'done', 'cancelled'],
  'audit-logs': [],
};
const AUTO_CATEGORIES = Object.keys(AUTO_DELETE_STATUSES) as Category[];

const DEFAULT_STATUSES: Partial<Record<Category, string[]>> = {
  invoices: ['paid'],
  contracts: ['expired', 'terminated'],
  customers: ['inactive'],
  quotations: ['rejected'],
  tickets: ['done'],
  'audit-logs': [],
};

const SETTING_KEY = 'auto-delete';
const CHUNK = 500;

const defaultRule = (category: Category): AutoDeleteRule => ({
  category,
  enabled: false,
  everyValue: 1,
  everyUnit: 'month',
  olderValue: 6,
  olderUnit: 'month',
  statuses: DEFAULT_STATUSES[category] ?? [],
  lastRunAt: null,
  lastDeleted: null,
});

/** Tables wiped by each reset (CASCADE also clears whatever depends on them) and the sequences to restart */
const RESET_PLAN: Record<Category, { tables: string[]; sequences: string[]; detach?: string[] }> = {
  customers: {
    tables: ['customer_contacts', 'customers', 'contracts', 'service_items', 'service_changes', 'invoices', 'invoice_items', 'payments'],
    sequences: ['customer', 'contract:%', 'invoice:%'],
    detach: ['tickets', 'quotations'],
  },
  contracts: {
    tables: ['contracts', 'service_items', 'service_changes', 'invoices', 'invoice_items', 'payments'],
    sequences: ['contract:%', 'invoice:%'],
    detach: ['tickets'],
  },
  services: { tables: ['service_items', 'service_changes'], sequences: [] },
  invoices: { tables: ['invoices', 'invoice_items', 'payments'], sequences: ['invoice:%'] },
  quotations: { tables: ['quotations'], sequences: ['quotation:%'] },
  tickets: { tables: ['ticket_comments', 'tickets'], sequences: ['ticket'] },
  'audit-logs': { tables: ['audit_logs'], sequences: [] },
};

const CATEGORY_LABEL: Record<Category, string> = {
  customers: 'Khách hàng',
  contracts: 'Hợp đồng',
  services: 'Dịch vụ',
  invoices: 'Hóa đơn',
  quotations: 'Báo giá',
  tickets: 'Ticket',
  'audit-logs': 'Nhật ký hoạt động',
};

function subtract(from: Date, value: number, unit: Unit): Date {
  const d = new Date(from);
  if (unit === 'day') d.setDate(d.getDate() - value);
  else if (unit === 'week') d.setDate(d.getDate() - value * 7);
  else if (unit === 'month') d.setMonth(d.getMonth() - value);
  else d.setFullYear(d.getFullYear() - value);
  return d;
}

function add(from: Date, value: number, unit: Unit): Date {
  return subtract(from, -value, unit);
}

const chunks = <T>(arr: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
};

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private running = false;

  constructor(
    @InjectRepository(AppSetting) private readonly settings: Repository<AppSetting>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditLogsService,
  ) {}

  /* ---------- configuration ---------- */

  meta() {
    return {
      categories: CATEGORIES.map((key) => ({ key, label: CATEGORY_LABEL[key] })),
      statuses: AUTO_DELETE_STATUSES,
    };
  }

  async rules(): Promise<AutoDeleteRule[]> {
    const row = await this.settings.findOne({ where: { key: SETTING_KEY } });
    const stored: Partial<AutoDeleteRule>[] = row?.value?.rules ?? [];
    return AUTO_CATEGORIES.map((category) => ({ ...defaultRule(category), ...(stored.find((r) => r.category === category) ?? {}), category }));
  }

  async saveRules(input: AutoDeleteRuleDto[], actor: AuthUser) {
    const current = await this.rules();
    const next = current.map((cur) => {
      const dto = input.find((r) => r.category === cur.category);
      if (!dto) return cur;
      const allowed = AUTO_DELETE_STATUSES[cur.category] ?? [];
      const statuses = [...new Set(dto.statuses ?? [])].filter((s) => allowed.includes(s));
      if (dto.enabled && allowed.length && !statuses.length) {
        throw new BadRequestException(`${CATEGORY_LABEL[cur.category]}: chọn ít nhất một điều kiện trạng thái`);
      }
      const scheduleChanged = dto.everyValue !== cur.everyValue || dto.everyUnit !== cur.everyUnit;
      return {
        ...cur,
        enabled: dto.enabled,
        everyValue: dto.everyValue,
        everyUnit: dto.everyUnit,
        olderValue: dto.olderValue,
        olderUnit: dto.olderUnit,
        statuses,
        // The first run happens one full interval after enabling (or changing the schedule), never right away
        lastRunAt: dto.enabled && (!cur.enabled || scheduleChanged || !cur.lastRunAt) ? new Date().toISOString() : cur.lastRunAt,
      } as AutoDeleteRule;
    });
    await this.settings.save({ key: SETTING_KEY, value: { rules: next } });
    const on = next.filter((r) => r.enabled).map((r) => CATEGORY_LABEL[r.category]);
    await this.audit.log(actor, 'Cập nhật tự động xóa dữ liệu', on.length ? `Đang bật: ${on.join(', ')}` : 'Tắt tất cả');
    return this.rules();
  }

  /* ---------- eligibility ---------- */

  private rule(rules: AutoDeleteRule[], category: Category) {
    const found = rules.find((r) => r.category === category);
    if (!found) throw new BadRequestException('Hạng mục này không hỗ trợ tự động xóa');
    return found;
  }

  private cutoff(rule: AutoDeleteRule) {
    return subtract(new Date(), rule.olderValue, rule.olderUnit);
  }

  /** Ids of records matching a rule (status condition + age) */
  private async eligibleIds(category: Category, rule: AutoDeleteRule, m: EntityManager = this.dataSource.manager): Promise<string[]> {
    const cutoff = this.cutoff(rule);
    const statuses = rule.statuses;
    const needStatus = (AUTO_DELETE_STATUSES[category] ?? []).length > 0;
    if (needStatus && !statuses.length) return [];

    switch (category) {
      case 'invoices': {
        const rows = await m.getRepository(Invoice).createQueryBuilder('x').select('x.id', 'id')
          .where('x.status IN (:...st) AND x.createdAt < :cutoff', { st: statuses, cutoff }).getRawMany();
        return rows.map((r) => r.id);
      }
      case 'contracts': {
        const rows = await m.getRepository(Contract).createQueryBuilder('x').select('x.id', 'id')
          .where('x.status IN (:...st) AND x.createdAt < :cutoff', { st: statuses, cutoff }).getRawMany();
        return rows.map((r) => r.id);
      }
      case 'customers': {
        // Only inactive customers that no longer have any contract or invoice
        const rows = await m.getRepository(Customer).createQueryBuilder('x').select('x.id', 'id')
          .where('x.status IN (:...st) AND x.createdAt < :cutoff', { st: statuses, cutoff })
          .andWhere('NOT EXISTS (SELECT 1 FROM contracts c WHERE c.customer_id = x.id AND c.deleted_at IS NULL)')
          .andWhere('NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = x.id AND i.deleted_at IS NULL)')
          .getRawMany();
        return rows.map((r) => r.id);
      }
      case 'quotations': {
        const rows = await m.getRepository(Quotation).createQueryBuilder('x').select('x.id', 'id')
          .where('x.status IN (:...st) AND x.createdAt < :cutoff', { st: statuses, cutoff }).getRawMany();
        return rows.map((r) => r.id);
      }
      case 'tickets': {
        const rows = await m.getRepository(Ticket).createQueryBuilder('x').select('x.id', 'id')
          .where('x.status IN (:...st) AND x.createdAt < :cutoff', { st: statuses, cutoff }).getRawMany();
        return rows.map((r) => r.id);
      }
      case 'audit-logs': {
        const rows = await m.getRepository(AuditLog).createQueryBuilder('x').select('x.id', 'id')
          .where('x.at < :cutoff', { cutoff }).getRawMany();
        return rows.map((r) => r.id);
      }
      default:
        return [];
    }
  }

  /** How many records the saved/edited rule would delete right now */
  async preview(category: Category, override?: AutoDeleteRuleDto) {
    const rules = await this.rules();
    const rule = { ...this.rule(rules, category), ...(override ? this.sanitize(category, override) : {}) };
    return { count: (await this.eligibleIds(category, rule)).length, cutoff: this.cutoff(rule).toISOString() };
  }

  private sanitize(category: Category, dto: AutoDeleteRuleDto): Partial<AutoDeleteRule> {
    const allowed = AUTO_DELETE_STATUSES[category] ?? [];
    return {
      olderValue: dto.olderValue,
      olderUnit: dto.olderUnit,
      statuses: [...new Set(dto.statuses ?? [])].filter((s) => allowed.includes(s)),
    };
  }

  /* ---------- auto delete execution ---------- */

  private async purge(category: Category, ids: string[]) {
    if (!ids.length) return 0;
    await this.dataSource.transaction(async (m) => {
      for (const part of chunks(ids)) {
        switch (category) {
          case 'invoices':
            await m.softDelete(Payment, { invoiceId: In(part) });
            await m.softDelete(InvoiceItem, { invoiceId: In(part) });
            await m.softDelete(Invoice, { id: In(part) });
            break;
          case 'contracts':
            await softDeleteContracts(m, part);
            break;
          case 'customers':
            await m.delete(Contact, { customerId: In(part) });
            await m.softDelete(Customer, { id: In(part) });
            break;
          case 'quotations':
            await m.softDelete(Quotation, { id: In(part) });
            break;
          case 'tickets':
            await m.softDelete(Ticket, { id: In(part) });
            break;
          case 'audit-logs':
            await m.delete(AuditLog, { id: In(part) });
            break;
        }
      }
    });
    return ids.length;
  }

  /** Runs one rule now (manual button or scheduler) and records the result */
  async runRule(category: Category, actor: AuthUser | string = 'Hệ thống') {
    const rules = await this.rules();
    const rule = this.rule(rules, category);
    const deleted = await this.purge(category, await this.eligibleIds(category, rule));
    const next = rules.map((r) => (r.category === category ? { ...r, lastRunAt: new Date().toISOString(), lastDeleted: deleted } : r));
    await this.settings.save({ key: SETTING_KEY, value: { rules: next } });
    await this.audit.log(actor, 'Tự động xóa dữ liệu', `${CATEGORY_LABEL[category]}: ${deleted} bản ghi`);
    return { deleted, rules: next };
  }

  private isDue(rule: AutoDeleteRule, now: Date) {
    if (!rule.enabled) return false;
    if (!rule.lastRunAt) return true;
    return add(new Date(rule.lastRunAt), rule.everyValue, rule.everyUnit) <= now;
  }

  /** Hourly check: every rule decides on its own whether its interval has elapsed */
  @Cron('10 * * * *', { timeZone: process.env.TIME_ZONE ?? 'Asia/Ho_Chi_Minh' })
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      for (const rule of await this.rules()) {
        if (!this.isDue(rule, now)) continue;
        try {
          const { deleted } = await this.runRule(rule.category);
          this.logger.log(`Auto-delete ${rule.category}: ${deleted}`);
        } catch (e) {
          this.logger.error(`Auto-delete ${rule.category} failed: ${(e as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /* ---------- reset ---------- */

  /** Permanently wipes the data of one category (and everything that depends on it) */
  async reset(category: Category, actor: AuthUser) {
    const plan = RESET_PLAN[category];
    if (!plan) throw new BadRequestException('Hạng mục không hợp lệ');
    await this.dataSource.transaction(async (m) => {
      await this.wipe(m, plan.tables, plan.sequences, plan.detach);
    });
    await this.audit.log(actor, 'Reset dữ liệu', CATEGORY_LABEL[category]);
    return { reset: category };
  }

  /** Wipes all business data. Users, company/payment/template settings and integrations are kept. */
  async resetAll(actor: AuthUser) {
    const tables = [...new Set(CATEGORIES.flatMap((c) => RESET_PLAN[c].tables))];
    await this.dataSource.transaction(async (m) => {
      await this.wipe(m, tables, [], []);
      await m.query('DELETE FROM sequences');
    });
    await this.audit.log(actor, 'Reset toàn bộ hệ thống', 'Đã xóa toàn bộ dữ liệu nghiệp vụ');
    return { reset: 'all' };
  }

  private async wipe(m: EntityManager, tables: string[], sequences: string[], detach: string[] = []) {
    // identifiers come from the constant plan above, never from user input
    await m.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`);
    for (const pattern of sequences) {
      if (pattern.endsWith('%')) await m.query('DELETE FROM sequences WHERE "key" LIKE $1', [pattern]);
      else await m.query('DELETE FROM sequences WHERE "key" = $1', [pattern]);
    }
    for (const t of detach) {
      if (t === 'tickets') await m.query('UPDATE tickets SET customer_id = NULL, contract_id = NULL');
      if (t === 'quotations') await m.query('UPDATE quotations SET customer_id = NULL');
    }
  }
}
