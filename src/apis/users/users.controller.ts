import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@Roles(PERMISSION.USER_MANAGE)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.service.createUser(body, user);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.service.updateUser(id, body, user);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resetPassword(id, user, body?.password);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeUser(id, user);
  }
}
