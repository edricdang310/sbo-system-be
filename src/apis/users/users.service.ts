import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ROLE, ROLE_RANK } from 'src/common/enum';
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

  /**
   * Hierarchy rules enforced on the server (the UI only mirrors them):
   *  - nobody manages their own account here (use /auth/profile and /auth/change-password)
   *  - an actor can only manage accounts of a strictly lower rank:
   *    SYSTEM_ADMIN manages admins and staff, ADMIN manages staff only, admins never manage each other
   */
  private assertCanManage(actor: AuthUser, target: User) {
    if (target.id === actor.id) {
      throw new ForbiddenException('Không thể thao tác trên chính tài khoản của bạn tại đây. Hãy dùng Hồ sơ cá nhân.');
    }
    if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
      throw new ForbiddenException(
        target.role === ROLE.SYSTEM_ADMIN
          ? 'Không ai được thay đổi tài khoản System Admin'
          : 'Bạn không có quyền thao tác trên tài khoản có cấp bậc ngang hoặc cao hơn bạn. Chỉ System Admin quản lý được Quản trị viên.',
      );
    }
  }

  /** Which roles an actor may hand out: System Admin is never assignable, Admin only by the System Admin */
  private assertCanAssignRole(actor: AuthUser, role: ROLE) {
    if (role === ROLE.SYSTEM_ADMIN) throw new ForbiddenException('Không thể gán vai trò System Admin');
    if (ROLE_RANK[actor.role] <= ROLE_RANK[role]) {
      throw new ForbiddenException('Chỉ System Admin mới được tạo hoặc cấp vai trò Quản trị viên');
    }
  }

  async createUser(dto: CreateUserDto, actor: AuthUser) {
    return this.guard(async () => {
      this.assertCanAssignRole(actor, dto.role);
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

  /** Account info only (name, email, role, status). Passwords go through resetPassword. */
  async updateUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    return this.guard(async () => {
      const user = await this.users.findByIdOrFail(id);
      this.assertCanManage(actor, user);
      if (dto.role !== undefined && dto.role !== user.role) this.assertCanAssignRole(actor, dto.role);

      if (dto.email && dto.email !== user.email) {
        const existing = await this.users.findByEmailWithPassword(dto.email);
        if (existing && existing.id !== id) throw new ConflictException('Email đã được sử dụng');
      }

      const patch: Partial<User> = {};
      if (dto.name !== undefined) patch.name = dto.name.trim();
      if (dto.email !== undefined) patch.email = dto.email;
      if (dto.role !== undefined) patch.role = dto.role;
      if (dto.active !== undefined) patch.active = dto.active;

      const updated = await this.users.updateByIdOrFail(id, patch);
      await this.audit.log(actor, 'Cập nhật nhân viên', updated.email);
      return updated;
    });
  }

  async resetPassword(id: string, actor: AuthUser, newPassword?: string) {
    return this.guard(async () => {
      const user = await this.users.findByIdOrFail(id);
      this.assertCanManage(actor, user);
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
      this.assertCanManage(actor, user);
      await this.users.updateByIdOrFail(id, { email: `${user.email}.deleted.${Date.now()}`, active: false } as Partial<User>);
      await this.users.softDeleteOrFail(id);
      await this.audit.log(actor, 'Xóa nhân viên', user.email);
    });
  }
}
