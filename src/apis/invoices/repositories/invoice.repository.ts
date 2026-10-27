import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoiceRepository extends PostgresAbstractRepository<Invoice> {
  constructor(@InjectRepository(Invoice) repository: Repository<Invoice>) {
    super(repository, Invoice);
  }
}
