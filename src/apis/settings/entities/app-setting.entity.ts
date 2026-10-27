import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Singleton settings documents (company, invoice-template, exchange-rates, telegram, ai) stored as JSON */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, any>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
