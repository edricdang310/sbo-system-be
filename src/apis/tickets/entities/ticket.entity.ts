import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from 'src/common/enum';
import { TicketComment } from './ticket-comment.entity';

/** A work request raised by Sale for the technical team */
@Entity('tickets')
export class Ticket extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  category: TICKET_CATEGORY;

  @Column({ type: 'varchar', length: 20, default: TICKET_PRIORITY.NORMAL })
  priority: TICKET_PRIORITY;

  @Index()
  @Column({ type: 'varchar', length: 20, default: TICKET_STATUS.OPEN })
  status: TICKET_STATUS;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId?: string | null;

  /** Taken from the token, never from the request body */
  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @Column({ name: 'created_by_name', type: 'varchar', length: 200 })
  createdByName: string;

  @Index()
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @Column({ name: 'assignee_name', type: 'varchar', length: 200, nullable: true })
  assigneeName?: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments: TicketComment[];
}
