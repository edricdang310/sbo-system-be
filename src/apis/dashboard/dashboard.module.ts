import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity';
import { ServiceItem } from '../contracts/entities/service-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contract, ServiceItem])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
