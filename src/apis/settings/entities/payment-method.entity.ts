import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { CURRENCY, PAYMENT_METHOD_KIND } from 'src/common/enum';

/** Receiving account shown on invoices: bank transfer, e-wallet or crypto wallet */
@Entity('payment_methods')
export class PaymentMethod extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: PAYMENT_METHOD_KIND;

  /** Display name, e.g. "Vietcombank", "MoMo", "USDT" */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  holder?: string;

  /** Account number, phone number or wallet address */
  @Column({ type: 'varchar', length: 300 })
  account: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  network?: string;

  /** Crypto wallets only: VND per 1 unit of the coin (used when invoicing in USD / USDT) */
  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true, transformer: numericTransformer })
  rate?: number;

  /** QR code image (data URL) */
  @Column({ name: 'qr_url', type: 'text', nullable: true })
  qrUrl?: string;

  @Column({ type: 'jsonb', default: () => "'[\"VND\"]'" })
  currencies: CURRENCY[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
