import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, TokenPayload } from 'src/common/interfaces/auth.interface';
import { UserRepository } from 'src/apis/users/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  /** Reload the user so a locked account or changed role takes effect immediately, not at token expiry */
  async validate(payload: TokenPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.active) throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
