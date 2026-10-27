import { InternalServerErrorException, Logger, HttpException } from '@nestjs/common';
import { DeepPartial, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BaseEntity } from '../database/entities/base.entity';
import { PostgresRepositoryInterface } from '../database/repository/postgres.interface.repository';
import { ConditionQueryMany } from '../filters/ConditionQuery';
import { FindAllResponse } from '../types/common.type';

/**
 * Generic CRUD service. Known HTTP errors bubble up unchanged,
 * anything else is logged and converted to a 500 (same contract as nail_store).
 */
export abstract class BaseServiceAbstract<T extends BaseEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  protected constructor(protected readonly repository: PostgresRepositoryInterface<T>) {}

  protected async guard<R>(fn: () => Promise<R>): Promise<R> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  find(condition?: ConditionQueryMany<T>): Promise<T[]> {
    return this.guard(() => this.repository.find(condition));
  }

  findAll(condition: ConditionQueryMany<T>): Promise<FindAllResponse<T>> {
    return this.guard(() => this.repository.findAll(condition));
  }

  countBy(condition?: FindOptionsWhere<T>): Promise<number> {
    return this.guard(() => this.repository.countBy(condition));
  }

  create(dto: DeepPartial<T>): Promise<T> {
    return this.guard(() => this.repository.create(dto));
  }

  findById(id: string, options?: FindOneOptions<T>): Promise<T> {
    return this.guard(() => this.repository.findByIdOrFail(id, options));
  }

  updateById(id: string, dto: QueryDeepPartialEntity<T>): Promise<T> {
    return this.guard(() => this.repository.updateByIdOrFail(id, dto));
  }

  softDelete(id: string): Promise<T> {
    return this.guard(() => this.repository.softDeleteOrFail(id));
  }
}
