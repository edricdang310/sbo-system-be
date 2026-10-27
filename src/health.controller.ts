import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Liveness + DB reachability for Docker / load balancers */
  @Get()
  @Public()
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
