import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, PaymentMethod])],
  controllers: [SettingsController],
  providers: [SettingsService, PaymentMethodRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
