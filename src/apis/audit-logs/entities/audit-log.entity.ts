import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at: Date;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /** Display name of the actor (snapshot, kept even if the user is renamed/removed) */
  @Column({ type: 'varchar', length: 200 })
  user: string;

  @Column({ type: 'varchar', length: 200 })
  action: string;

  @Column({ type: 'varchar', length: 500 })
  target: string;
}
