import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { SequenceService } from 'src/common/sequence/sequence.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { ROLE, TICKET_STATUS } from 'src/common/enum';
import { assertIsoDate } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Contract } from '../contracts/entities/contract.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketRepository } from './repositories/ticket.repository';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';

const WITH_COMMENTS = { relations: { comments: true }, order: { createdAt: 'DESC', comments: { at: 'ASC' } } } as const;

@Injectable()
export class TicketsService extends BaseServiceAbstract<Ticket> {
  constructor(
    private readonly tickets: TicketRepository,
    @InjectRepository(TicketComment) private readonly comments: Repository<TicketComment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditLogsService,
  ) {
    super(tickets);
  }

  list() {
    return this.guard(() => this.tickets.find({ options: WITH_COMMENTS as any }));
  }

  private get(id: string) {
    return this.guard(async () => {
      const ticket = await this.tickets.findOne({ filter: { id }, options: WITH_COMMENTS as any });
      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
      return ticket;
    });
  }

  /** Assignee must be an active technician or admin */
  private async resolveAssignee(assigneeId: string) {
    const user = await this.users.findOne({ where: { id: assigneeId } });
    if (!user || !user.active || ![ROLE.TECH, ROLE.ADMIN].includes(user.role)) {
      throw new BadRequestException('Người xử lý phải là nhân viên Kỹ thuật hoặc Quản trị đang hoạt động');
    }
    return user;
  }

  createTicket(dto: CreateTicketDto, actor: AuthUser) {
    return this.guard(async () => {
      if (dto.dueDate) assertIsoDate(dto.dueDate, 'Hạn hoàn thành');
      if (dto.customerId && !(await this.customers.exist({ where: { id: dto.customerId } }))) {
        throw new BadRequestException('Khách hàng không tồn tại');
      }
      if (dto.contractId) {
        const contract = await this.contracts.findOne({ where: { id: dto.contractId } });
        if (!contract) throw new BadRequestException('Hợp đồng không tồn tại');
        if (dto.customerId && contract.customerId !== dto.customerId) {
          throw new BadRequestException('Hợp đồng không thuộc khách hàng đã chọn');
        }
      }
      const assignee = dto.assigneeId ? await this.resolveAssignee(dto.assigneeId) : null;

      const created = await this.tickets.create({
        code: await this.sequence.ticketCode(),
        title: dto.title.trim(),
        description: dto.description ?? '',
        category: dto.category,
        priority: dto.priority,
        status: TICKET_STATUS.OPEN, // always starts open, whatever the client sends
        customerId: dto.customerId ?? null,
        contractId: dto.contractId ?? null,
        dueDate: dto.dueDate ?? null,
        createdById: actor.id,
        createdByName: actor.name,
        assigneeId: assignee?.id ?? null,
        assigneeName: assignee?.name ?? null,
      });
      await this.audit.log(actor, 'Tạo ticket', `${created.code} · ${created.title}`);
      return this.get(created.id);
    });
  }

  updateTicket(id: string, dto: UpdateTicketDto, actor: AuthUser) {
    return this.guard(async () => {
      const ticket = await this.tickets.findByIdOrFail(id);
      const patch: Partial<Ticket> = {};

      if (dto.priority !== undefined) patch.priority = dto.priority;
      if (dto.dueDate !== undefined) {
        if (dto.dueDate) assertIsoDate(dto.dueDate, 'Hạn hoàn thành');
        patch.dueDate = dto.dueDate;
      }
      if (dto.assigneeId !== undefined) {
        const assignee = dto.assigneeId ? await this.resolveAssignee(dto.assigneeId) : null;
        patch.assigneeId = assignee?.id ?? null;
        patch.assigneeName = assignee?.name ?? null;
        if (patch.assigneeId !== (ticket.assigneeId ?? null)) {
          await this.audit.log(actor, 'Đổi người xử lý ticket', `${ticket.code} → ${assignee?.name ?? 'chưa giao'}`);
        }
      }
      if (dto.status !== undefined && dto.status !== ticket.status) {
        patch.status = dto.status;
        await this.audit.log(actor, 'Đổi trạng thái ticket', `${ticket.code}: ${ticket.status} → ${dto.status}`);
      }

      if (Object.keys(patch).length) await this.tickets.updateByIdOrFail(id, patch as any);
      return this.get(id);
    });
  }

  addComment(id: string, content: string, actor: AuthUser) {
    return this.guard(async () => {
      const ticket = await this.tickets.findByIdOrFail(id);
      if (ticket.status === TICKET_STATUS.CANCELLED) throw new ForbiddenException('Ticket đã hủy, không thể bình luận');
      await this.comments.save(this.comments.create({ ticketId: id, userId: actor.id, userName: actor.name, content: content.trim() }));
      await this.tickets.updateById(id, { updatedAt: new Date() } as any); // bump "last activity"
      return this.get(id);
    });
  }

  /** Admin only (enforced by the controller) */
  removeTicket(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const ticket = await this.tickets.findByIdOrFail(id);
      await this.tickets.softDeleteOrFail(id);
      await this.audit.log(actor, 'Xóa ticket', `${ticket.code} · ${ticket.title}`);
    });
  }
}
