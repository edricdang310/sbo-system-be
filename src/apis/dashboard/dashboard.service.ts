import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ACTIVE_STATUS, CONTRACT_STATUS, hasPermission, PERMISSION, SERVICE_STATUS } from 'src/common/enum';
import { addDays, daysBetween, todayIso } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { Customer } from '../customers/entities/customer.entity';

/** Window (days) for the "expiring services" widget; already-expired services stay listed with negative days */
const EXPIRING_WINDOW_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditLogsService,
  ) {}

  async get(user: AuthUser) {
    const today = todayIso();
    const canSeeMoney = hasPermission(user.role, PERMISSION.INVOICE_VIEW);

    const [activeCustomers, activeContracts, expectedRevenue, unpaidAmount, expiring, revenueByMonth, activity] = await Promise.all([
      this.dataSource.getRepository(Customer).count({ where: { status: ACTIVE_STATUS.ACTIVE } }),
      this.dataSource.getRepository(Contract).count({ where: { status: CONTRACT_STATUS.ACTIVE } }),
      canSeeMoney ? this.expectedRevenue() : 0,
      canSeeMoney ? this.unpaidAmount() : 0,
      this.expiring(today),
      canSeeMoney ? this.revenueByMonth(today) : [],
      this.audit.recent(10),
    ]);

    return { activeCustomers, activeContracts, expectedRevenue, unpaidAmount, expiring, revenueByMonth, activity };
  }

  /** Monthly recurring revenue: running services of active contracts */
  private async expectedRevenue() {
    const [row] = await this.dataSource.query(
      `SELECT COALESCE(SUM(s.unit_price * s.quantity), 0) AS total
         FROM service_items s JOIN contracts c ON c.id = s.contract_id
        WHERE s.status = $1 AND c.status = $2 AND s.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [SERVICE_STATUS.ACTIVE, CONTRACT_STATUS.ACTIVE],
    );
    return Math.round(Number(row.total));
  }

  /** Outstanding balance of unpaid + overdue invoices (lines total minus payments) */
  private async unpaidAmount() {
    const [row] = await this.dataSource.query(
      `SELECT COALESCE(SUM(t.total - t.paid), 0) AS amount FROM (
         SELECT (SELECT COALESCE(SUM((l->>'quantity')::numeric * (l->>'unitPrice')::numeric), 0) FROM jsonb_array_elements(i.lines) l) AS total,
                (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id AND p.deleted_at IS NULL) AS paid
           FROM invoices i
          WHERE i.status IN ('unpaid', 'overdue') AND i.deleted_at IS NULL
       ) t`,
    );
    return Math.round(Number(row.amount));
  }

  private async expiring(today: string) {
    const services = await this.dataSource
      .getRepository(ServiceItem)
      .createQueryBuilder('s')
      .where('s.status = :status AND s.endDate IS NOT NULL AND s.endDate <= :limit', {
        status: SERVICE_STATUS.ACTIVE,
        limit: addDays(today, EXPIRING_WINDOW_DAYS),
      })
      .orderBy('s.endDate', 'ASC')
      .getMany();
    if (!services.length) return [];

    const contracts = await this.dataSource.getRepository(Contract).findByIds([...new Set(services.map((s) => s.contractId))]);
    const byId = new Map(contracts.map((c) => [c.id, c]));
    return services
      .filter((s) => byId.get(s.contractId)?.status === CONTRACT_STATUS.ACTIVE)
      .map((service) => ({
        contract: { ...byId.get(service.contractId), services: [] },
        service,
        days: daysBetween(today, service.endDate),
      }));
  }

  /** Cash received per month for the last 6 months, in millions of VND (labels "T5".."T10") */
  private async revenueByMonth(today: string) {
    const [year, month] = today.split('-').map(Number);
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `T${d.getMonth() + 1}` };
    });
    const rows: { month: string; total: string }[] = await this.dataSource.query(
      `SELECT to_char(paid_at, 'YYYY-MM') AS month, SUM(amount) AS total
         FROM payments WHERE deleted_at IS NULL AND paid_at >= $1
        GROUP BY 1`,
      [`${months[0].key}-01`],
    );
    const totals = new Map(rows.map((r) => [r.month, Number(r.total)]));
    return months.map((m) => ({ label: m.label, value: Math.round((totals.get(m.key) ?? 0) / 1_000_000) }));
  }
}
