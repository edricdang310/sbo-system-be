import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { SERVICE_TYPE } from 'src/common/enum';
import { Invoice } from './invoice.entity';

/** Snapshot of one service billed on an invoice, covering the window [from, to] */
@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Index()
  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @Column({ type: 'varchar', length: 300 })
  name: string;

  /** IP / domain etc. for display */
  @Column({ type: 'varchar', length: 300, nullable: true })
  ident?: string;

  @Column({ name: 'period_from', type: 'date' })
  from: string;

  @Column({ name: 'period_to', type: 'date' })
  to: string;

  /** Billed months = cycle months × number of cycles */
  @Column({ type: 'int' })
  months: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  quantity: number;

  /** Price per month */
  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ name: 'service_type', type: 'varchar', length: 20, nullable: true })
  serviceType?: SERVICE_TYPE;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, string>;

  @Column({ type: 'int', default: 1 })
  cycles: number;

  @Column({ name: 'cycle_label', type: 'varchar', length: 50, nullable: true })
  cycleLabel?: string;
}
