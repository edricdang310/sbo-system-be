import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { BILLING_CYCLE, SERVICE_STATUS, SERVICE_TYPE } from 'src/common/enum';
import { Contract } from './contract.entity';
import { ServiceChange } from './service-change.entity';

@Entity('service_items')
export class ServiceItem extends BaseEntity {
  @Index()
  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'varchar', length: 20 })
  type: SERVICE_TYPE;

  @Column({ type: 'varchar', length: 300 })
  name: string;

  /** Free-form configuration depending on the service type (CPU, RAM, IP/domain...) */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, string>;

  @Column({ name: 'portal_account', type: 'varchar', length: 300, default: '' })
  portalAccount: string;

  /** Price per month */
  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2, default: 0, transformer: numericTransformer })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1, transformer: numericTransformer })
  quantity: number;

  /** Stopped services are kept as usage history instead of being deleted */
  @Column({ type: 'varchar', length: 10, default: SERVICE_STATUS.ACTIVE })
  status: SERVICE_STATUS;

  /** Date the service record was created (editable, defaults to today); billing uses startDate instead */
  @Column({ name: 'created_date', type: 'date', default: () => 'CURRENT_DATE' })
  createdDate: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'stop_date', type: 'date', nullable: true })
  stopDate?: string | null;

  /** Expected expiry date; null = not determined */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  /** Service-specific billing cycle; null = follow the contract */
  @Column({ name: 'billing_cycle', type: 'varchar', length: 20, nullable: true })
  billingCycle?: BILLING_CYCLE | null;

  /** Paid through this date (inclusive). Invoices skip periods already covered. */
  @Column({ name: 'paid_until', type: 'date', nullable: true })
  paidUntil?: string | null;

  @OneToMany(() => ServiceChange, (change) => change.service)
  history?: ServiceChange[];
}
