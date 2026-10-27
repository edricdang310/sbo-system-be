import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from 'src/common/decorators/role.decorators';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { QuotationsService } from './quotations.service';
import { SaveQuotationDto, SaveQuotationTemplateDto } from './dto/quotation.dto';

@Controller()
@ApiTags('quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  /** Link sent to the customer; no login, protected by an unguessable token and a rate limit */
  @Get('public/quotations/:token')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  publicView(@Param('token') token: string) {
    return this.service.publicView(token);
  }

  @Get('quotations')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_VIEW)
  findAll() {
    return this.service.list();
  }

  @Post('quotations')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  create(@Body() body: SaveQuotationDto, @CurrentUser() user: AuthUser) {
    return this.service.createQuotation(body, user);
  }

  @Put('quotations/:id')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: SaveQuotationDto, @CurrentUser() user: AuthUser) {
    return this.service.updateQuotation(id, body, user);
  }

  @Delete('quotations/:id')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeQuotation(id, user);
  }

  @Get('quotation-templates')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_VIEW)
  templates() {
    return this.service.listTemplates();
  }

  @Post('quotation-templates')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  createTemplate(@Body() body: SaveQuotationTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.createTemplate(body, user);
  }

  @Put('quotation-templates/:id')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() body: SaveQuotationTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.updateTemplate(id, body, user);
  }

  @Delete('quotation-templates/:id')
  @ApiBearerAuth()
  @Roles(PERMISSION.QUOTATION_MANAGE)
  @HttpCode(204)
  removeTemplate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeTemplate(id, user);
  }
}
