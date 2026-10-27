import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment, User, Customer, Contract])],
  controllers: [TicketsController],
  providers: [TicketsService, TicketRepository],
})
export class TicketsModule {}
