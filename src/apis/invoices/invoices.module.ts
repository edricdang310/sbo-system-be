import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { ContractsModule } from '../contracts/contracts.module';
import { TelegramModule } from '../telegram/telegram.module';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { InvoiceRepository } from './repositories/invoice.repository';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, Payment, Contract, ServiceItem]),
    ContractsModule,
    TelegramModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceRepository],
  exports: [InvoicesService],
})
export class InvoicesModule {}
