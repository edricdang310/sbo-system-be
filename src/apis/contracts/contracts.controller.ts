import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ContractsService } from './contracts.service';
import { AddServiceGroupDto, CreateContractDto, SaveServiceDto, SetServiceStatusDto, UpdateContractDto } from './dto/contract.dto';

@Controller('contracts')
@ApiTags('contracts')
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Roles(PERMISSION.CONTRACT_VIEW)
  findAll() {
    return this.service.list();
  }

  @Get(':id')
  @Roles(PERMISSION.CONTRACT_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @Roles(PERMISSION.CONTRACT_MANAGE)
  create(@Body() body: CreateContractDto, @CurrentUser() user: AuthUser) {
    return this.service.createContract(body, user);
  }

  @Put(':id')
  @Roles(PERMISSION.CONTRACT_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateContractDto, @CurrentUser() user: AuthUser) {
    return this.service.updateContract(id, body, user);
  }

  /** Administrators only (user:manage is held by admin alone) */
  @Delete(':id')
  @Roles(PERMISSION.USER_MANAGE)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeContract(id, user);
  }

  @Post(':id/service-groups')
  @Roles(PERMISSION.CONTRACT_MANAGE, PERMISSION.SERVICE_MANAGE)
  addServiceGroup(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddServiceGroupDto, @CurrentUser() user: AuthUser) {
    return this.service.addServiceGroup(id, body.type, user);
  }

  @Post(':id/services')
  @Roles(PERMISSION.SERVICE_MANAGE)
  createService(@Param('id', ParseUUIDPipe) id: string, @Body() body: SaveServiceDto, @CurrentUser() user: AuthUser) {
    return this.service.saveService(id, body, user);
  }

  @Put(':id/services/:sid')
  @Roles(PERMISSION.SERVICE_MANAGE)
  updateService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sid', ParseUUIDPipe) sid: string,
    @Body() body: SaveServiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.saveService(id, body, user, sid);
  }

  @Post(':id/services/:sid/status')
  @Roles(PERMISSION.SERVICE_MANAGE)
  @HttpCode(200)
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sid', ParseUUIDPipe) sid: string,
    @Body() body: SetServiceStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setServiceStatus(id, sid, body, user);
  }

  @Delete(':id/services/:sid')
  @Roles(PERMISSION.SERVICE_MANAGE)
  @HttpCode(204)
  removeService(@Param('id', ParseUUIDPipe) id: string, @Param('sid', ParseUUIDPipe) sid: string, @CurrentUser() user: AuthUser) {
    return this.service.removeService(id, sid, user);
  }
}
