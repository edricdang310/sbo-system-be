import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { QUOTATION_STATUS, SERVICE_TYPE } from 'src/common/enum';

export interface QuotationItem {
  type: SERVICE_TYPE;
  name: string;
  /** Free-form extra description */
  config: string;
  quantity: number;
  unitPrice: number;
  /** Service-specific parameters keyed by the service type's fields */
  specs?: Record<string, string>;
  unit?: string;
  /** Billing months (default 1) */
  months?: number;
  /** Discount percent (default 0) */
  discount?: number;
}

export interface QuotationCustomerInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

@Entity('quotations')
export class Quotation extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil: string;

  @Column({ type: 'varchar', length: 20, default: QUOTATION_STATUS.DRAFT })
  status: QUOTATION_STATUS;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: QuotationItem[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'template_id', type: 'varchar', length: 64, nullable: true })
  templateId?: string | null;

  /** VAT percent (default 0) */
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: numericTransformer })
  vat: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  terms: string[];

  @Column({ name: 'customer_info', type: 'jsonb', nullable: true })
  customerInfo?: QuotationCustomerInfo | null;

  /** Unguessable token for the public (no-login) link sent to the customer */
  @Index({ unique: true })
  @Column({ name: 'share_token', type: 'varchar', length: 64 })
  shareToken: string;

  @Column({ name: 'created_by', type: 'varchar', length: 200, nullable: true })
  createdBy?: string;
}
