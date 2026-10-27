import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { Customer } from './entities/customer.entity';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contact])],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerRepository],
  exports: [CustomersService, CustomerRepository],
})
export class CustomersModule {}
