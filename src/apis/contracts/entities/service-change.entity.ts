import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SERVICE_CHANGE_KIND } from 'src/common/enum';
import { ServiceItem } from './service-item.entity';

export interface ServiceChangeDetail {
  field: string;
  before: string;
  after: string;
}

/** Append-only audit trail of a service (created / updated / stopped / resumed / renewed) */
@Entity('service_changes')
export class ServiceChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => ServiceItem, (service) => service.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: ServiceItem;

  @CreateDateColumn({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'varchar', length: 20 })
  kind: SERVICE_CHANGE_KIND;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  changes: ServiceChangeDetail[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  /** Name of the actor */
  @Column({ type: 'varchar', length: 200, nullable: true })
  by?: string;
}
