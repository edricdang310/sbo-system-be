import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ConfirmDto, AutoDeleteRuleDto, SaveAutoDeleteDto } from './dto/maintenance.dto';
import { CATEGORIES, Category, MaintenanceService } from './maintenance.service';

const category = (value: string): Category => {
  if (!(CATEGORIES as readonly string[]).includes(value)) throw new BadRequestException('Hạng mục không hợp lệ');
  return value as Category;
};
const confirmed = (body: ConfirmDto) => {
  if (body?.confirm !== 'RESET') throw new BadRequestException('Cần xác nhận bằng cách nhập RESET');
};

/** Administrator-only data clean-up tools */
@Controller('maintenance')
@ApiTags('maintenance')
@ApiBearerAuth()
@Roles(PERMISSION.USER_MANAGE)
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get('meta')
  meta() {
    return this.service.meta();
  }

  @Get('auto-delete')
  rules() {
    return this.service.rules();
  }

  @Put('auto-delete')
  saveRules(@Body() body: SaveAutoDeleteDto, @CurrentUser() user: AuthUser) {
    return this.service.saveRules(body.rules, user);
  }

  /** Counts what a rule would delete right now (optionally with unsaved edits) */
  @Post('auto-delete/:category/preview')
  preview(@Param('category') c: string, @Body() body: AutoDeleteRuleDto) {
    return this.service.preview(category(c), body);
  }

  @Post('auto-delete/:category/run')
  run(@Param('category') c: string, @CurrentUser() user: AuthUser) {
    return this.service.runRule(category(c), user);
  }

  @Post('reset-all')
  resetAll(@Body() body: ConfirmDto, @CurrentUser() user: AuthUser) {
    confirmed(body);
    return this.service.resetAll(user);
  }

  @Post('reset/:category')
  reset(@Param('category') c: string, @Body() body: ConfirmDto, @CurrentUser() user: AuthUser) {
    confirmed(body);
    return this.service.reset(category(c), user);
  }
}
