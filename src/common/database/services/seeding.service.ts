import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ROLE } from 'src/common/enum';
import { SettingsService } from 'src/apis/settings/settings.service';
import { UserRepository } from 'src/apis/users/repositories/user.repository';
import { UsersService } from 'src/apis/users/users.service';

/** Runs once at boot: first admin account + default settings documents (idempotent) */
@Injectable()
export class SeedingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: UserRepository,
    private readonly usersService: UsersService,
    private readonly settings: SettingsService,
  ) {}

  async onApplicationBootstrap() {
    await this.settings.ensureDefaults();
    await this.seedAdmin();
  }

  private async seedAdmin() {
    if ((await this.users.countBy()) > 0) return;

    const email = this.config.get<string>('DEFAULT_ADMIN_EMAIL', 'admin@sbo.local').toLowerCase();
    const password = this.config.get<string>('DEFAULT_ADMIN_PASSWORD', 'Admin@123');
    await this.users.create({
      name: this.config.get<string>('DEFAULT_ADMIN_NAME', 'Quản trị viên'),
      email,
      role: ROLE.ADMIN,
      active: true,
      passwordHash: await this.usersService.hash(password),
    });
    this.logger.warn(`Created default admin ${email}. Change this password immediately after the first login.`);
  }
}
