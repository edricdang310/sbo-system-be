import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ROLE_PERMISSIONS } from 'src/common/enum';
import { AuthUser, TokenPayload } from 'src/common/interfaces/auth.interface';
import { UserRepository } from '../users/repositories/user.repository';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

// Hash compared when the email does not exist, so response time does not reveal valid emails
const DUMMY_HASH = bcrypt.hashSync('sbo-timing-equalizer', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly audit: AuditLogsService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithPassword(email);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user.active) throw new UnauthorizedException('Tài khoản đã bị khóa');

    await this.users.updateById(user.id, { lastLoginAt: new Date() });
    const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    await this.audit.log({ id: user.id, name: user.name }, 'Đăng nhập', user.email);

    return { accessToken, user: this.profile({ id: user.id, name: user.name, email: user.email, role: user.role }) };
  }

  /** User as sbo-fe expects it, plus the permission list so the UI can stay in sync with the server matrix */
  profile(user: AuthUser) {
    return { ...user, active: true, permissions: ROLE_PERMISSIONS[user.role] ?? [] };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (currentPassword === newPassword) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
    await this.users.updateById(userId, { passwordHash: await this.usersService.hash(newPassword) });
    await this.audit.log({ id: user.id, name: user.name }, 'Đổi mật khẩu', user.email);
  }
}
