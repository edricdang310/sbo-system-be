import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository extends PostgresAbstractRepository<Customer> {
  constructor(@InjectRepository(Customer) repository: Repository<Customer>) {
    super(repository, Customer);
  }
}
