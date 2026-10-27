import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { QuotationRepository } from './repositories/quotation.repository';
import { QuotationTemplateRepository } from './repositories/quotation-template.repository';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationTemplate, Customer])],
  controllers: [QuotationsController],
  providers: [QuotationsService, QuotationRepository, QuotationTemplateRepository],
})
export class QuotationsModule {}
