import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { SequenceService } from 'src/common/sequence/sequence.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { BILLING_CYCLE, CONTRACT_STATUS, CYCLE_LABEL, SERVICE_CHANGE_KIND, SERVICE_STATUS } from 'src/common/enum';
import { todayIso } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Customer } from '../customers/entities/customer.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Contract } from './entities/contract.entity';
import { ServiceItem } from './entities/service-item.entity';
import { softDeleteContracts } from './contract-cascade';
import { ServiceChange, ServiceChangeDetail } from './entities/service-change.entity';
import { ContractRepository } from './repositories/contract.repository';
import { CreateContractDto, SaveServiceDto, SetServiceStatusDto, UpdateContractDto } from './dto/contract.dto';
import { SERVICE_TYPE } from 'src/common/enum';

const str = (v: unknown) => String(v ?? '');

/** Field-level diff between two versions of a service (same labels as sbo-fe) */
export function diffService(a: ServiceItem, b: ServiceItem): ServiceChangeDetail[] {
  const out: ServiceChangeDetail[] = [];
  const cmp = (field: string, x: unknown, y: unknown) => {
    if (str(x) !== str(y)) out.push({ field, before: str(x), after: str(y) });
  };
  const cycle = (c?: BILLING_CYCLE | null) => (c ? CYCLE_LABEL[c] : 'Theo hợp đồng');
  cmp('Tên dịch vụ', a.name, b.name);
  cmp('Đơn giá', a.unitPrice, b.unitPrice);
  cmp('Số lượng', a.quantity, b.quantity);
  cmp('Tài khoản portal', a.portalAccount, b.portalAccount);
  cmp('Kỳ thanh toán', cycle(a.billingCycle), cycle(b.billingCycle));
  cmp('Ngày khởi tạo', a.createdDate, b.createdDate);
  cmp('Ngày bắt đầu', a.startDate, b.startDate);
  cmp('Ngày hết hạn', a.endDate, b.endDate);
  cmp('Đã trả đến', a.paidUntil, b.paidUntil);
  for (const k of new Set([...Object.keys(a.config ?? {}), ...Object.keys(b.config ?? {})])) {
    if (k.startsWith('_')) continue;
    cmp(k, a.config?.[k], b.config?.[k]);
  }
  return out;
}

function normalizeConfig(config?: Record<string, unknown>): Record<string, string> {
  const entries = Object.entries(config ?? {});
  if (entries.length > 50) throw new BadRequestException('Cấu hình dịch vụ có quá nhiều trường (tối đa 50)');
  return Object.fromEntries(entries.map(([k, v]) => [k.slice(0, 100), str(v).slice(0, 1000)]));
}

@Injectable()
export class ContractsService extends BaseServiceAbstract<Contract> {
  constructor(
    private readonly contracts: ContractRepository,
    private readonly dataSource: DataSource,
    private readonly sequence: SequenceService,
    private readonly audit: AuditLogsService,
  ) {
    super(contracts);
  }

  list() {
    return this.guard(() =>
      this.contracts.find({
        options: { relations: { services: true }, order: { createdAt: 'DESC', services: { createdAt: 'ASC' } } },
      }),
    );
  }

  /** Contract with services and each service's change history (oldest first) */
  get(id: string, manager: EntityManager = this.dataSource.manager) {
    return this.guard(async () => {
      const contract = await manager.findOne(Contract, {
        where: { id },
        relations: { services: { history: true } },
        order: { services: { createdAt: 'ASC' } },
      });
      if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
      for (const s of contract.services) s.history = (s.history ?? []).sort((x, y) => +x.date - +y.date);
      return contract;
    });
  }

  createContract(dto: CreateContractDto, actor: AuthUser) {
    return this.guard(async () => {
      const customer = await this.dataSource.getRepository(Customer).findOne({ where: { id: dto.customerId } });
      if (!customer) throw new BadRequestException('Khách hàng không tồn tại');

      const groups = [...new Set([dto.serviceType, ...(dto.serviceGroups ?? [])])];
      const created = await this.contracts.create({
        code: await this.sequence.contractCode(),
        customerId: dto.customerId,
        billingCycle: dto.billingCycle,
        serviceType: dto.serviceType,
        serviceGroups: groups,
        paymentType: dto.paymentType,
        status: CONTRACT_STATUS.DRAFT,
        note: dto.note,
      });
      await this.audit.log(actor, 'Tạo hợp đồng', `${created.code} · ${customer.name}`);
      return this.get(created.id);
    });
  }

  /**
   * Correct the details entered at creation. The customer and the service category are locked once
   * they would contradict existing invoices / services.
   */
  updateContract(id: string, dto: UpdateContractDto, actor: AuthUser) {
    return this.guard(async () => {
      const contract = await this.get(id);
      const patch: Partial<Contract> = {};

      if (dto.customerId !== undefined && dto.customerId !== contract.customerId) {
        const customer = await this.dataSource.getRepository(Customer).findOne({ where: { id: dto.customerId } });
        if (!customer) throw new BadRequestException('Khách hàng không tồn tại');
        const invoiced = await this.dataSource.getRepository(Invoice).count({ where: { contractId: id } });
        if (invoiced > 0) throw new ConflictException('Hợp đồng đã xuất hóa đơn nên không thể đổi khách hàng');
        patch.customerId = dto.customerId;
      }
      if (dto.serviceType !== undefined && dto.serviceType !== contract.serviceType) {
        if (contract.services.length > 0) {
          throw new ConflictException('Hợp đồng đã có dịch vụ nên không thể đổi loại dịch vụ');
        }
        patch.serviceType = dto.serviceType;
        patch.serviceGroups = [dto.serviceType];
      }
      if (dto.billingCycle !== undefined) patch.billingCycle = dto.billingCycle;
      if (dto.paymentType !== undefined) patch.paymentType = dto.paymentType;
      if (dto.note !== undefined) patch.note = dto.note;

      if (Object.keys(patch).length) await this.contracts.updateByIdOrFail(id, patch as any);
      await this.audit.log(actor, 'Cập nhật hợp đồng', contract.code);
      return this.get(id);
    });
  }

  addServiceGroup(contractId: string, type: SERVICE_TYPE, actor: AuthUser) {
    return this.guard(async () => {
      const contract = await this.contracts.findByIdOrFail(contractId);
      contract.serviceGroups = [...new Set([...(contract.serviceGroups ?? []), type])];
      await this.contracts.updateByIdOrFail(contractId, { serviceGroups: contract.serviceGroups });
      await this.audit.log(actor, 'Thêm nhóm dịch vụ', `${contract.code} · ${type}`);
      return this.get(contractId);
    });
  }

  private assertTypeAllowed(contract: Contract, type: SERVICE_TYPE) {
    const allowed = new Set([contract.serviceType, ...(contract.serviceGroups ?? [])]);
    if (!allowed.has(type)) {
      throw new BadRequestException(`Hợp đồng ${contract.code} không chạy loại dịch vụ "${type}"`);
    }
  }

  /** Create (no serviceId) or update a service; every change is appended to its history */
  saveService(contractId: string, dto: SaveServiceDto, actor: AuthUser, serviceId?: string) {
    return this.guard(async () => {
      const saved = await this.dataSource.transaction(async (m) => {
        const contract = await m.findOne(Contract, { where: { id: contractId } });
        if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
        this.assertTypeAllowed(contract, dto.type);

        if (!serviceId) {
          const service = await m.save(
            ServiceItem,
            m.create(ServiceItem, {
              contractId,
              type: dto.type,
              name: dto.name.trim(),
              config: normalizeConfig(dto.config),
              portalAccount: dto.portalAccount ?? '',
              unitPrice: dto.unitPrice,
              quantity: dto.quantity,
              status: SERVICE_STATUS.ACTIVE,
              createdDate: dto.createdDate || todayIso(),
              startDate: dto.startDate || todayIso(),
              stopDate: null,
              endDate: dto.endDate ?? null,
              billingCycle: dto.billingCycle ?? null,
              paidUntil: dto.paidUntil ?? null,
            }),
          );
          const blank = { name: '', unitPrice: '', quantity: '', portalAccount: '', billingCycle: null, createdDate: '', startDate: '', endDate: '', paidUntil: '', config: {} } as unknown as ServiceItem;
          const initial = diffService(blank, service).filter((c) => c.after !== '');
          await this.addHistory(m, service.id, SERVICE_CHANGE_KIND.CREATED, initial, actor.name);
          if (contract.status === CONTRACT_STATUS.DRAFT) {
            await m.update(Contract, contractId, { status: CONTRACT_STATUS.ACTIVE });
          }
          await this.audit.log(actor, 'Thêm dịch vụ', `${contract.code} · ${service.name}`);
          return service.id;
        }

        const service = await m.findOne(ServiceItem, { where: { id: serviceId, contractId } });
        if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
        const before = { ...service, config: { ...service.config } } as ServiceItem;

        service.type = dto.type;
        service.name = dto.name.trim();
        service.config = normalizeConfig(dto.config);
        service.portalAccount = dto.portalAccount ?? '';
        service.unitPrice = dto.unitPrice;
        service.quantity = dto.quantity;
        if (dto.createdDate) service.createdDate = dto.createdDate;
        if (dto.startDate) service.startDate = dto.startDate;
        if (dto.endDate !== undefined) service.endDate = dto.endDate;
        if (dto.billingCycle !== undefined) service.billingCycle = dto.billingCycle;
        if (dto.paidUntil !== undefined) service.paidUntil = dto.paidUntil;

        const changes = diffService(before, service);
        await m.save(ServiceItem, service);
        if (changes.length) {
          await this.addHistory(m, service.id, SERVICE_CHANGE_KIND.UPDATED, changes, actor.name);
          await this.audit.log(actor, 'Cập nhật dịch vụ', `${contract.code} · ${service.name}`);
        }
        return service.id;
      });
      return this.loadService(saved);
    });
  }

  /** Stop (keeps the service as usage history) or resume a service */
  setServiceStatus(contractId: string, serviceId: string, dto: SetServiceStatusDto, actor: AuthUser) {
    return this.guard(async () => {
      await this.dataSource.transaction(async (m) => {
        const service = await m.findOne(ServiceItem, { where: { id: serviceId, contractId } });
        if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
        if (service.status === dto.status) {
          throw new BadRequestException(dto.status === SERVICE_STATUS.STOPPED ? 'Dịch vụ đã dừng' : 'Dịch vụ đang chạy');
        }
        const stopping = dto.status === SERVICE_STATUS.STOPPED;
        if (stopping && service.startDate && dto.date < service.startDate) {
          throw new BadRequestException('Ngày dừng không được trước ngày bắt đầu');
        }
        await m.update(ServiceItem, serviceId, { status: dto.status, stopDate: stopping ? dto.date : null });
        await this.addHistory(
          m,
          serviceId,
          stopping ? SERVICE_CHANGE_KIND.STOPPED : SERVICE_CHANGE_KIND.RESUMED,
          [],
          actor.name,
          dto.note,
        );
        await this.audit.log(actor, stopping ? 'Dừng dịch vụ' : 'Chạy lại dịch vụ', `${service.name} (${dto.date})`);
      });
      return this.loadService(serviceId);
    });
  }

  /** Admin only (enforced by the controller): removes the contract with its services, invoices and payments */
  removeContract(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const contract = await this.contracts.findByIdOrFail(id);
      await this.dataSource.transaction((m) => softDeleteContracts(m, [id]));
      await this.audit.log(actor, 'Xóa hợp đồng', contract.code);
    });
  }

  /** A service that has been billed is part of the financial history and can only be stopped, never deleted */
  removeService(contractId: string, serviceId: string, actor: AuthUser) {
    return this.guard(async () => {
      const service = await this.dataSource.getRepository(ServiceItem).findOne({ where: { id: serviceId, contractId } });
      if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
      const billed = await this.dataSource.getRepository(InvoiceItem).count({ where: { serviceId } });
      if (billed > 0) {
        throw new ConflictException('Dịch vụ đã được xuất hóa đơn nên không thể xóa. Hãy dừng dịch vụ để giữ lịch sử.');
      }
      await this.dataSource.getRepository(ServiceItem).softDelete(serviceId);
      await this.audit.log(actor, 'Xóa dịch vụ', service.name);
    });
  }

  private async loadService(id: string) {
    const service = await this.dataSource.getRepository(ServiceItem).findOne({ where: { id }, relations: { history: true } });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
    service.history = (service.history ?? []).sort((x, y) => +x.date - +y.date);
    return service;
  }

  /** Also used by InvoicesService when a payment renews a service */
  addHistory(
    manager: EntityManager,
    serviceId: string,
    kind: SERVICE_CHANGE_KIND,
    changes: ServiceChangeDetail[],
    by?: string,
    note?: string,
  ) {
    return manager.save(ServiceChange, manager.create(ServiceChange, { serviceId, kind, changes, by, note }));
  }
}
