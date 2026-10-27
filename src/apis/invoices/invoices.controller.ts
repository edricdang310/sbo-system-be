import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { InvoicesService } from './invoices.service';
import { AddAttachmentsDto, CreateInvoiceDto, CreatePaymentDto, SendTelegramDto, SettleInvoiceDto } from './dto/invoice.dto';

@Controller('invoices')
@ApiTags('invoices')
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Roles(PERMISSION.INVOICE_VIEW)
  findAll() {
    return this.service.list();
  }

  @Get(':id')
  @Roles(PERMISSION.INVOICE_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @Roles(PERMISSION.INVOICE_MANAGE)
  create(@Body() body: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.createInvoice(body, user);
  }

  @Post(':id/cancel')
  @Roles(PERMISSION.INVOICE_MANAGE)
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user);
  }

  /** Administrators only (user:manage is held by admin alone) */
  @Delete(':id')
  @Roles(PERMISSION.USER_MANAGE)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  @Post(':id/payments')
  @Roles(PERMISSION.PAYMENT_MANAGE)
  addPayment(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.service.addPayment(id, body, user);
  }

  @Post(':id/settle')
  @Roles(PERMISSION.PAYMENT_MANAGE)
  settle(@Param('id', ParseUUIDPipe) id: string, @Body() body: SettleInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.settle(id, body, user);
  }

  @Post(':id/payments/:pid/attachments')
  @Roles(PERMISSION.PAYMENT_MANAGE)
  addAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() body: AddAttachmentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addPaymentFiles(id, pid, body.files, user);
  }

  @Delete(':id/payments/:pid/attachments/:index')
  @Roles(PERMISSION.PAYMENT_MANAGE)
  removeAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('index', ParseIntPipe) index: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removePaymentFile(id, pid, index, user);
  }

  @Post(':id/send-telegram')
  @Roles(PERMISSION.INVOICE_MANAGE)
  @HttpCode(204)
  sendTelegram(@Param('id', ParseUUIDPipe) id: string, @Body() body: SendTelegramDto, @CurrentUser() user: AuthUser) {
    return this.service.sendTelegram(id, body, user);
  }
}
