import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { Quotation } from '../entities/quotation.entity';

@Injectable()
export class QuotationRepository extends PostgresAbstractRepository<Quotation> {
  constructor(@InjectRepository(Quotation) repository: Repository<Quotation>) {
    super(repository, Quotation);
  }
}
