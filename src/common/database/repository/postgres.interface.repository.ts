import { FindOneOptions, FindOptionsWhere, QueryRunner, DeepPartial, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { FindAllResponse } from 'src/common/types/common.type';
import { ConditionQueryMany, ConditionQueryOne } from 'src/common/filters/ConditionQuery';
import { BaseEntity } from '../entities/base.entity';

export interface PostgresRepositoryInterface<T extends BaseEntity> {
  getRepository(): Repository<T>;
  create(dto: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T>;
  save(entity: T, queryRunner?: QueryRunner): Promise<T>;
  findById(id: string, options?: FindOneOptions<T>): Promise<T | null>;
  findByIdOrFail(id: string, options?: FindOneOptions<T>): Promise<T>;
  findOne(condition?: ConditionQueryOne<T>): Promise<T | null>;
  findOneOrFail(condition?: ConditionQueryOne<T>): Promise<T>;
  find(condition?: ConditionQueryMany<T>): Promise<T[]>;
  findAll(condition: ConditionQueryMany<T>): Promise<FindAllResponse<T>>;
  countBy(conditions?: FindOptionsWhere<T>): Promise<number>;
  updateById(id: string, dto: QueryDeepPartialEntity<T>, queryRunner?: QueryRunner): Promise<T | null>;
  updateByIdOrFail(id: string, dto: QueryDeepPartialEntity<T>, queryRunner?: QueryRunner): Promise<T>;
  softDelete(id: string, queryRunner?: QueryRunner): Promise<T | null>;
  softDeleteOrFail(id: string, queryRunner?: QueryRunner): Promise<T>;
  permanentlyDelete(id: string, queryRunner?: QueryRunner): Promise<T | null>;
  startTransaction(): Promise<QueryRunner>;
  commitTransaction(queryRunner: QueryRunner): Promise<void>;
  rollbackTransaction(queryRunner: QueryRunner): Promise<void>;
}
