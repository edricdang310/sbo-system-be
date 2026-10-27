import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 200 })
  userName: string;

  @Column({ type: 'text' })
  content: string;

  /** ISO date-time the comment was written */
  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at: Date;
}
