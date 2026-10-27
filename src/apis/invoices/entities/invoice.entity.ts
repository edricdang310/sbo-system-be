import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { INVOICE_STATUS } from 'src/common/enum';
import { Customer } from 'src/apis/customers/entities/customer.entity';
import { Contract } from 'src/apis/contracts/entities/contract.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from './payment.entity';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  /** Human label of the billing period, e.g. "Tháng 10/2026" */
  @Column({ type: 'varchar', length: 100 })
  period: string;

  @Column({ name: 'period_from', type: 'date', nullable: true })
  periodFrom?: string;

  @Column({ name: 'period_to', type: 'date', nullable: true })
  periodTo?: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: INVOICE_STATUS.UNPAID })
  status: INVOICE_STATUS;

  /** Printable lines derived from `items` at creation time */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  lines: InvoiceLine[];

  /** True once the paid invoice has advanced the services' paidUntil (guards against double application) */
  @Column({ type: 'boolean', default: false })
  applied: boolean;

  @Column({ name: 'telegram_sent', type: 'boolean', default: false })
  telegramSent: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 200, nullable: true })
  createdBy?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items: InvoiceItem[];

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];
}
