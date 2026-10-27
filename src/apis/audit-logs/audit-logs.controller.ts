import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { PERMISSION } from 'src/common/enum';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@ApiTags('audit-logs')
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles(PERMISSION.SETTINGS_MANAGE)
  list(@Query('limit') limit?: string) {
    return this.service.recent(limit ? parseInt(limit, 10) : 100);
  }
}
