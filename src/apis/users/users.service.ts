import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ROLE } from 'src/common/enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService extends BaseServiceAbstract<User> {
  constructor(
    private readonly users: UserRepository,
    private readonly audit: AuditLogsService,
  ) {
    super(users);
  }

  list() {
    return this.users.find({ options: { order: { createdAt: 'ASC' } } });
  }

  private tempPassword() {
    return randomBytes(9).toString('base64url');
  }

  hash(password: string) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /** Count other active admins (used to keep at least one admin alive) */
  private countOtherActiveAdmins(excludeId: string) {
    return this.users
      .getRepository()
      .createQueryBuilder('u')
      .where('u.role = :role AND u.active = true AND u.id <> :id', { role: ROLE.ADMIN, id: excludeId })
      .getCount();
  }

  async createUser(dto: CreateUserDto, actor: AuthUser) {
    return this.guard(async () => {
      if (await this.users.findByEmailWithPassword(dto.email)) throw new ConflictException('Email đã được sử dụng');
      const password = dto.password ?? this.tempPassword();
      const created = await this.users.create({
        name: dto.name.trim(),
        email: dto.email,
        role: dto.role,
        active: dto.active ?? true,
        passwordHash: await this.hash(password),
      });
      await this.audit.log(actor, 'Thêm nhân viên', created.email);
      const { passwordHash: _ph, ...user } = created as any;
      // The generated password is shown once; it is never stored in clear text
      return dto.password ? user : { ...user, temporaryPassword: password };
    });
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    return this.guard(async () => {
      const user = await this.users.findByIdOrFail(id);

      if (dto.email && dto.email !== user.email) {
        const existing = await this.users.findByEmailWithPassword(dto.email);
        if (existing && existing.id !== id) throw new ConflictException('Email đã được sử dụng');
      }

      const nextRole = dto.role ?? user.role;
      const nextActive = dto.active ?? user.active;
      const demoting = user.role === ROLE.ADMIN && user.active && (nextRole !== ROLE.ADMIN || !nextActive);
      if (demoting) {
        if (id === actor.id) throw new BadRequestException('Bạn không thể tự khóa hoặc hạ quyền chính mình');
        if ((await this.countOtherActiveAdmins(id)) === 0) {
          throw new BadRequestException('Phải còn ít nhất một quản trị viên đang hoạt động');
        }
      }

      const patch: Partial<User> = {};
      if (dto.name !== undefined) patch.name = dto.name.trim();
      if (dto.email !== undefined) patch.email = dto.email;
      if (dto.role !== undefined) patch.role = dto.role;
      if (dto.active !== undefined) patch.active = dto.active;
      if (dto.password) patch.passwordHash = await this.hash(dto.password);

      const updated = await this.users.updateByIdOrFail(id, patch);
      await this.audit.log(actor, 'Cập nhật nhân viên', updated.email);
      return updated;
    });
  }

  async resetPassword(id: string, actor: AuthUser, newPassword?: string) {
    return this.guard(async () => {
      const user = await this.users.findByIdOrFail(id);
      const password = newPassword?.trim() ? newPassword.trim() : this.tempPassword();
      await this.users.updateByIdOrFail(id, { passwordHash: await this.hash(password) });
      await this.audit.log(actor, 'Đặt lại mật khẩu', user.email);
      return { temporaryPassword: password };
    });
  }

  /** Soft delete. The email is released so it can be reused for a new account. */
  async removeUser(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const user = await this.users.findByIdOrFail(id);
      if (id === actor.id) throw new BadRequestException('Bạn không thể tự xóa tài khoản của mình');
      if (user.role === ROLE.ADMIN && user.active && (await this.countOtherActiveAdmins(id)) === 0) {
        throw new BadRequestException('Phải còn ít nhất một quản trị viên đang hoạt động');
      }
      await this.users.updateByIdOrFail(id, { email: `${user.email}.deleted.${Date.now()}`, active: false } as Partial<User>);
      await this.users.softDeleteOrFail(id);
      await this.audit.log(actor, 'Xóa nhân viên', user.email);
    });
  }
}
