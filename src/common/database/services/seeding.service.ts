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
    await this.settings.loadRolePermissions();
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const email = this.config.get<string>('DEFAULT_ADMIN_EMAIL', 'admin@sbo.local').toLowerCase();

    if ((await this.users.countBy()) > 0) {
      await this.ensureSystemAdmin(email);
      return;
    }

    const password = this.config.get<string>('DEFAULT_ADMIN_PASSWORD', 'Admin@123');
    await this.users.create({
      name: this.config.get<string>('DEFAULT_ADMIN_NAME', 'Quản trị viên'),
      email,
      role: ROLE.SYSTEM_ADMIN,
      active: true,
      passwordHash: await this.usersService.hash(password),
    });
    this.logger.warn(`Created default system admin ${email}. Change this password immediately after the first login.`);
  }

  /** Upgrade path for databases created before the System Admin role existed */
  private async ensureSystemAdmin(defaultEmail: string) {
    const repo = this.users.getRepository();
    if ((await repo.count({ where: { role: ROLE.SYSTEM_ADMIN } })) > 0) return;
    const target =
      (await repo.findOne({ where: { email: defaultEmail } })) ??
      (await repo.findOne({ where: { role: ROLE.ADMIN }, order: { createdAt: 'ASC' } }));
    if (!target) return;
    await repo.update(target.id, { role: ROLE.SYSTEM_ADMIN });
    this.logger.warn(`Promoted ${target.email} to System Admin (no System Admin existed).`);
  }
}
