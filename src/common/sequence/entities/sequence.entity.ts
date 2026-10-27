import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Atomic counters for human-readable codes (KH-0001, HD-2026-001, INV-2026-0001...) */
@Entity('sequences')
export class Sequence {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'int', default: 0 })
  value: number;
}
