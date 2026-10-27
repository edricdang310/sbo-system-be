import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contract, Invoice])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
