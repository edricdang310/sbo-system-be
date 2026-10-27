import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Contract } from './entities/contract.entity';
import { ServiceItem } from './entities/service-item.entity';
import { ServiceChange } from './entities/service-change.entity';
import { ContractRepository } from './repositories/contract.repository';
import { ServiceItemRepository } from './repositories/service-item.repository';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ServiceItem, ServiceChange, Customer])],
  controllers: [ContractsController],
  providers: [ContractsService, ContractRepository, ServiceItemRepository],
  exports: [ContractsService, ContractRepository],
})
export class ContractsModule {}
