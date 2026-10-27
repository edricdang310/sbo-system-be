import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { DashboardService } from './dashboard.service';

/** Visible to every signed-in role; money figures are zeroed for roles without invoice:view */
@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.service.get(user);
  }
}
