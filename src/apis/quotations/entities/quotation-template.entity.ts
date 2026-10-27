import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { numericTransformer } from 'src/common/database/transformers/numeric.transformer';
import { QuotationItem } from './quotation.entity';

@Entity('quotation_templates')
export class QuotationTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: QuotationItem[];

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: numericTransformer })
  vat: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  terms: string[];
}
