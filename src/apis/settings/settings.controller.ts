import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { hasPermission, PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { SettingsService } from './settings.service';
import {
  AiSettingsDto,
  CompanySettingsDto,
  ExchangeRatesDto,
  InvoiceTemplateDto,
  PaymentMethodDto,
  RolePermissionsDto,
  TelegramSettingsDto,
} from './dto/settings.dto';

const P = PERMISSION;
/** Non-secret reference data needed to render invoices and quotations */
const READ_REFERENCE = [P.SETTINGS_MANAGE, P.INVOICE_VIEW, P.QUOTATION_VIEW];

@Controller('settings')
@ApiTags('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('role-permissions')
  @Roles(P.SETTINGS_MANAGE, P.USER_MANAGE)
  rolePermissions() {
    return this.service.rolePermissions();
  }

  /** System Admin only: enforced in the service on top of settings:manage */
  @Put('role-permissions')
  @Roles(P.SETTINGS_MANAGE)
  saveRolePermissions(@Body() body: RolePermissionsDto, @CurrentUser() user: AuthUser) {
    return this.service.saveRolePermissions(body, user);
  }

  @Post('role-permissions/reset')
  @Roles(P.SETTINGS_MANAGE)
  @HttpCode(200)
  resetRolePermissions(@CurrentUser() user: AuthUser) {
    return this.service.resetRolePermissions(user);
  }

  @Get('company')
  @Roles(...READ_REFERENCE)
  company() {
    return this.service.company();
  }

  @Put('company')
  @Roles(P.SETTINGS_MANAGE)
  saveCompany(@Body() body: CompanySettingsDto, @CurrentUser() user: AuthUser) {
    return this.service.saveCompany(body, user);
  }

  @Get('payment-methods')
  @Roles(...READ_REFERENCE)
  paymentMethods() {
    return this.service.listPaymentMethods();
  }

  @Post('payment-methods')
  @Roles(P.SETTINGS_MANAGE)
  createPaymentMethod(@Body() body: PaymentMethodDto, @CurrentUser() user: AuthUser) {
    return this.service.createPaymentMethod(body, user);
  }

  @Put('payment-methods/:id')
  @Roles(P.SETTINGS_MANAGE)
  updatePaymentMethod(@Param('id', ParseUUIDPipe) id: string, @Body() body: PaymentMethodDto, @CurrentUser() user: AuthUser) {
    return this.service.updatePaymentMethod(id, body, user);
  }

  @Delete('payment-methods/:id')
  @Roles(P.SETTINGS_MANAGE)
  @HttpCode(204)
  removePaymentMethod(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removePaymentMethod(id, user);
  }

  @Get('invoice-template')
  @Roles(...READ_REFERENCE)
  invoiceTemplate() {
    return this.service.invoiceTemplate();
  }

  @Put('invoice-template')
  @Roles(P.SETTINGS_MANAGE)
  saveInvoiceTemplate(@Body() body: InvoiceTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.saveInvoiceTemplate(body, user);
  }

  /** Kept for compatibility; rates now live on each crypto payment method */
  @Get('exchange-rates')
  @Roles(...READ_REFERENCE)
  rates() {
    return this.service.rates();
  }

  @Put('exchange-rates')
  @Roles(P.SETTINGS_MANAGE)
  saveRates(@Body() body: ExchangeRatesDto, @CurrentUser() user: AuthUser) {
    return this.service.saveRates(body, user);
  }

  @Get('telegram')
  @Roles(P.TELEGRAM_MANAGE, P.INVOICE_MANAGE)
  telegram() {
    return this.service.telegram();
  }

  @Put('telegram')
  @Roles(P.TELEGRAM_MANAGE)
  saveTelegram(@Body() body: TelegramSettingsDto, @CurrentUser() user: AuthUser) {
    return this.service.saveTelegram(body, user);
  }

  /** Any signed-in user may read the flags (the UI needs them); only admins see the key tail */
  @Get('ai')
  ai(@CurrentUser() user: AuthUser) {
    return this.service.ai(hasPermission(user.role, P.SETTINGS_MANAGE));
  }

  @Put('ai')
  @Roles(P.SETTINGS_MANAGE)
  saveAi(@Body() body: AiSettingsDto, @CurrentUser() user: AuthUser) {
    return this.service.saveAi(body, user);
  }
}
