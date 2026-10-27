import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { QuotationTemplate } from '../entities/quotation-template.entity';

@Injectable()
export class QuotationTemplateRepository extends PostgresAbstractRepository<QuotationTemplate> {
  constructor(@InjectRepository(QuotationTemplate) repository: Repository<QuotationTemplate>) {
    super(repository, QuotationTemplate);
  }
}
