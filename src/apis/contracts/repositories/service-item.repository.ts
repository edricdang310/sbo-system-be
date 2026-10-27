import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { ServiceItem } from '../entities/service-item.entity';

@Injectable()
export class ServiceItemRepository extends PostgresAbstractRepository<ServiceItem> {
  constructor(@InjectRepository(ServiceItem) repository: Repository<ServiceItem>) {
    super(repository, ServiceItem);
  }
}
