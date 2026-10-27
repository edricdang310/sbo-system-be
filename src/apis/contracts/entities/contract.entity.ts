import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { BILLING_CYCLE, CONTRACT_STATUS, PAYMENT_TYPE, SERVICE_TYPE } from 'src/common/enum';
import { Customer } from 'src/apis/customers/entities/customer.entity';
import { ServiceItem } from './service-item.entity';

@Entity('contracts')
export class Contract extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 20 })
  billingCycle: BILLING_CYCLE;

  /** Each contract runs exactly one service category, chosen at creation */
  @Column({ name: 'service_type', type: 'varchar', length: 20 })
  serviceType: SERVICE_TYPE;

  /** Service categories set up on the contract (kept even when empty) */
  @Column({ name: 'service_groups', type: 'jsonb', default: () => "'[]'" })
  serviceGroups: SERVICE_TYPE[];

  @Column({ name: 'payment_type', type: 'varchar', length: 20 })
  paymentType: PAYMENT_TYPE;

  @Column({ type: 'varchar', length: 20, default: CONTRACT_STATUS.DRAFT })
  status: CONTRACT_STATUS;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => ServiceItem, (service) => service.contract)
  services: ServiceItem[];
}
