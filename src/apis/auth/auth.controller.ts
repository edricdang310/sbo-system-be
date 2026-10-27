import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/login.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  /** Brute-force protection: 10 attempts / minute / IP */
  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() body: LoginDto) {
    return this.service.login(body.email, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.service.profile(user);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(204)
  changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.service.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
