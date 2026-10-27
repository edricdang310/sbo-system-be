import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { TelegramService } from './telegram.service';

/** No HTTP controller: invoices are sent through POST /invoices/:id/send-telegram, settings live in /settings/telegram */
@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Customer, Contract, ServiceItem])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
