import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Controller('customers')
@ApiTags('customers')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Roles(PERMISSION.CUSTOMER_VIEW)
  findAll() {
    return this.service.list();
  }

  @Get(':id')
  @Roles(PERMISSION.CUSTOMER_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @Roles(PERMISSION.CUSTOMER_MANAGE)
  create(@Body() body: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.service.createCustomer(body, user);
  }

  @Post('import')
  @Roles(PERMISSION.CUSTOMER_MANAGE)
  importCustomers(@Body() body: any, @CurrentUser() user: AuthUser) {
    const items = Array.isArray(body) ? body : (body?.items ?? []);
    return this.service.importCustomers(items, user);
  }

  @Put(':id')
  @Roles(PERMISSION.CUSTOMER_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.service.updateCustomer(id, body, user);
  }

  @Delete(':id')
  @Roles(PERMISSION.CUSTOMER_MANAGE)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeCustomer(id, user);
  }
}
