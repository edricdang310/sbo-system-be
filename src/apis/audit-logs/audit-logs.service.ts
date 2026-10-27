import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { AuditLog } from './entities/audit-log.entity';

type Actor = Pick<AuthUser, 'id' | 'name'> | string | null | undefined;

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}

  /** Never throws: an audit failure must not break the business operation */
  async log(actor: Actor, action: string, target: string) {
    try {
      const isObj = actor && typeof actor === 'object';
      await this.repository.save(
        this.repository.create({
          userId: isObj ? (actor as AuthUser).id : null,
          user: isObj ? (actor as AuthUser).name : (actor as string) || 'Hệ thống',
          action,
          target: target.slice(0, 500),
        }),
      );
    } catch (error) {
      this.logger.error(`Cannot write audit log: ${(error as Error).message}`);
    }
  }

  async recent(limit = 100): Promise<AuditLog[]> {
    return this.repository.find({ order: { at: 'DESC' }, take: Math.min(Math.max(limit, 1), 500) });
  }
}
