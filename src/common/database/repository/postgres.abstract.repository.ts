import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOneOptions, FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { FindAllResponse } from 'src/common/types/common.type';
import { ConditionQueryMany, ConditionQueryOne } from 'src/common/filters/ConditionQuery';
import { BaseEntity } from '../entities/base.entity';
import { PostgresRepositoryInterface } from './postgres.interface.repository';

/** Translates the Postgres unique-violation error into a 409 */
const rethrow = (error: any): never => {
  if (error?.code === '23505') {
    const match = (error.detail || '').match(/Key \(([^)]+)\)/);
    throw new ConflictException(`Giá trị đã tồn tại: ${match ? match[1] : 'unknown field'}`);
  }
  throw error;
};

export abstract class PostgresAbstractRepository<T extends BaseEntity> implements PostgresRepositoryInterface<T> {
  public name: string;

  protected constructor(
    private readonly repository: Repository<T>,
    public readonly entity: { new (): T },
  ) {
    this.name = entity.name.toLowerCase();
  }

  getRepository() {
    return this.repository;
  }

  private repo(queryRunner?: QueryRunner): Repository<T> {
    return queryRunner ? queryRunner.manager.getRepository(this.entity) : this.repository;
  }

  async create(dto: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T> {
    try {
      const repo = this.repo(queryRunner);
      return await repo.save(repo.create(dto as any) as any);
    } catch (error) {
      return rethrow(error);
    }
  }

  async save(entity: T, queryRunner?: QueryRunner): Promise<T> {
    try {
      return await this.repo(queryRunner).save(entity);
    } catch (error) {
      return rethrow(error);
    }
  }

  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    if (!id) return null;
    return this.repository.findOne({ where: { id } as FindOptionsWhere<T>, ...options });
  }

  async findByIdOrFail(id: string, options?: FindOneOptions<T>): Promise<T> {
    const found = await this.findById(id, options);
    if (!found) throw new NotFoundException(`Không tìm thấy ${this.name}`);
    return found;
  }

  async findOne(condition: ConditionQueryOne<T> = {}): Promise<T | null> {
    return this.repository.findOne({ where: condition.filter, ...condition.options });
  }

  async findOneOrFail(condition: ConditionQueryOne<T> = {}): Promise<T> {
    const found = await this.findOne(condition);
    if (!found) throw new NotFoundException(`Không tìm thấy ${this.name}`);
    return found;
  }

  async find(condition?: ConditionQueryMany<T>): Promise<T[]> {
    return this.repository.find({ where: condition?.filter, ...condition?.options });
  }

  async findAll(condition: ConditionQueryMany<T>): Promise<FindAllResponse<T>> {
    const [data, total] = await this.repository.findAndCount({ where: condition.filter, ...condition.options });
    const limit = condition.options?.take ?? (total || 1);
    return {
      data,
      pagination: {
        page: condition.options?.skip ? Math.floor(condition.options.skip / limit) + 1 : 1,
        limit,
        total_items: total,
        total_page: Math.ceil(total / limit),
      },
    };
  }

  async countBy(conditions?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where: conditions });
  }

  async updateById(id: string, dto: QueryDeepPartialEntity<T>, queryRunner?: QueryRunner): Promise<T | null> {
    try {
      const repo = this.repo(queryRunner);
      await repo.update(id, dto);
      return await repo.findOne({ where: { id } as FindOptionsWhere<T> });
    } catch (error) {
      return rethrow(error);
    }
  }

  async updateByIdOrFail(id: string, dto: QueryDeepPartialEntity<T>, queryRunner?: QueryRunner): Promise<T> {
    const result = await this.updateById(id, dto, queryRunner);
    if (!result) throw new NotFoundException(`Không tìm thấy ${this.name}`);
    return result;
  }

  async softDelete(id: string, queryRunner?: QueryRunner): Promise<T | null> {
    const repo = this.repo(queryRunner);
    const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!entity) return null;
    await repo.softDelete(id);
    return entity;
  }

  async softDeleteOrFail(id: string, queryRunner?: QueryRunner): Promise<T> {
    const result = await this.softDelete(id, queryRunner);
    if (!result) throw new NotFoundException(`Không tìm thấy ${this.name}`);
    return result;
  }

  async permanentlyDelete(id: string, queryRunner?: QueryRunner): Promise<T | null> {
    const repo = this.repo(queryRunner);
    const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!entity) return null;
    await repo.delete(id);
    return entity;
  }

  async startTransaction(): Promise<QueryRunner> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  async commitTransaction(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.release();
  }

  async rollbackTransaction(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
}
