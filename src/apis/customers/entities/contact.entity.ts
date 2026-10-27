import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { Customer } from './customer.entity';

@Entity('customer_contacts')
export class Contact extends BaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  position: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  phone: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  email: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  telegram: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  zalo: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  facebook: string;
}
