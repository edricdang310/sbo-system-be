import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configs, envValidationSchema } from './configs';
import { CommonModule } from './common/common.module';
import { SeedingModule } from './common/database/seeding.module';
import { AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { PermissionGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './apis/auth/guards/jwt-auth.guard';
import { AuditLogsModule } from './apis/audit-logs/audit-logs.module';
import { SettingsModule } from './apis/settings/settings.module';
import { UsersModule } from './apis/users/users.module';
import { AuthModule } from './apis/auth/auth.module';
import { CustomersModule } from './apis/customers/customers.module';
import { ContractsModule } from './apis/contracts/contracts.module';
import { InvoicesModule } from './apis/invoices/invoices.module';
import { QuotationsModule } from './apis/quotations/quotations.module';
import { TicketsModule } from './apis/tickets/tickets.module';
import { TelegramModule } from './apis/telegram/telegram.module';
import { DashboardModule } from './apis/dashboard/dashboard.module';
import { AiModule } from './apis/ai/ai.module';
import { MaintenanceModule } from './apis/maintenance/maintenance.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: configs, validationSchema: envValidationSchema, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
    CommonModule,
    AuditLogsModule,
    SettingsModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ContractsModule,
    InvoicesModule,
    QuotationsModule,
    TicketsModule,
    TelegramModule,
    DashboardModule,
    AiModule,
    MaintenanceModule,
    SeedingModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit → authenticate → authorise
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          stopAtFirstError: true,
          forbidNonWhitelisted: false,
        }),
    },
  ],
})
export class AppModule {}
