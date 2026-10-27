import { FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';

export type ConditionQueryOne<T> = {
  filter?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  options?: Omit<FindOneOptions<T>, 'where'>;
};

export type ConditionQueryMany<T> = {
  filter?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  options?: Omit<FindManyOptions<T>, 'where'>;
};
