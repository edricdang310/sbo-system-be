import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresAbstractRepository } from 'src/common/database/repository/postgres.abstract.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends PostgresAbstractRepository<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository, User);
  }

  findByEmailWithPassword(email: string) {
    return this.getRepository()
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  findByIdWithPassword(id: string) {
    return this.getRepository().createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id }).getOne();
  }
}
