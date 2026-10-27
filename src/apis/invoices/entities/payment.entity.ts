import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { Invoice } from './invoice.entity';

export interface PaymentAttachment {
  name: string;
  /** MIME type, e.g. image/png or application/pdf */
  type: string;
  url: string;
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'paid_at', type: 'date' })
  paidAt: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer })
  amount: number;

  /** Currency the customer actually paid in (amount above is always the VND equivalent) */
  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  /** Amount in `currency` as paid (null for VND payments) */
  @Column({ name: 'original_amount', type: 'numeric', precision: 18, scale: 4, nullable: true, transformer: numericTransformer })
  originalAmount?: number | null;

  /** VND per 1 unit of `currency` used for the conversion */
  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true, transformer: numericTransformer })
  rate?: number | null;

  @Column({ type: 'varchar', length: 200, default: '' })
  bank: string;

  @Column({ name: 'transaction_code', type: 'varchar', length: 200, default: '' })
  transactionCode: string;

  @Column({ name: 'receipt_url', type: 'text', nullable: true })
  receiptUrl?: string;

  /** Receiving method used (from Settings) */
  @Column({ name: 'method_name', type: 'varchar', length: 200, nullable: true })
  methodName?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: PaymentAttachment[];

  @Column({ name: 'recorded_by', type: 'varchar', length: 200, nullable: true })
  recordedBy?: string;
}
