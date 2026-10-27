import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketRepository extends PostgresAbstractRepository<Ticket> {
  constructor(@InjectRepository(Ticket) repository: Repository<Ticket>) {
    super(repository, Ticket);
  }
}
