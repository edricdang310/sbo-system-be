import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { ACTIVE_STATUS, CUSTOMER_TYPE } from 'src/common/enum';
import { Contact } from './contact.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 20, default: CUSTOMER_TYPE.COMPANY })
  type: CUSTOMER_TYPE;

  @Column({ type: 'varchar', length: 300 })
  name: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, nullable: true })
  taxCode?: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  address: string;

  /** Anonymous account: only name, email and social accounts are kept (no tax code, phone or address) */
  @Column({ type: 'boolean', default: false })
  anonymous: boolean;

  @Column({ type: 'varchar', length: 200, default: '' })
  email: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  phone: string;

  @Column({ name: 'telegram_username', type: 'varchar', length: 100, nullable: true })
  telegramUsername?: string;

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 50, nullable: true })
  telegramChatId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zalo?: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  facebook?: string;

  @Column({ type: 'varchar', length: 20, default: ACTIVE_STATUS.ACTIVE })
  status: ACTIVE_STATUS;

  @OneToMany(() => Contact, (contact) => contact.customer, { cascade: true })
  contacts: Contact[];
}
