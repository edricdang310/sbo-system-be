import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { Contract } from '../entities/contract.entity';

@Injectable()
export class ContractRepository extends PostgresAbstractRepository<Contract> {
  constructor(@InjectRepository(Contract) repository: Repository<Contract>) {
    super(repository, Contract);
  }
}
