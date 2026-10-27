import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { PaymentMethod } from '../entities/payment-method.entity';

@Injectable()
export class PaymentMethodRepository extends PostgresAbstractRepository<PaymentMethod> {
  constructor(@InjectRepository(PaymentMethod) repository: Repository<PaymentMethod>) {
    super(repository, PaymentMethod);
  }
}
