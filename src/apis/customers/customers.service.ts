import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { isUUID } from 'class-validator';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { SequenceService } from 'src/common/sequence/sequence.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Contract } from '../contracts/entities/contract.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { softDeleteContracts } from '../contracts/contract-cascade';
import { ROLE } from 'src/common/enum';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { CustomerRepository } from './repositories/customer.repository';
import { ContactDto, CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

const WITH_CONTACTS = { relations: { contacts: true }, order: { createdAt: 'DESC', contacts: { createdAt: 'ASC' } } } as const;

@Injectable()
export class CustomersService extends BaseServiceAbstract<Customer> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly dataSource: DataSource,
    private readonly sequence: SequenceService,
    private readonly audit: AuditLogsService,
  ) {
    super(customers);
  }

  list() {
    return this.guard(() => this.customers.find({ options: WITH_CONTACTS as any }));
  }

  get(id: string) {
    return this.guard(async () => {
      const found = await this.customers.findOne({ filter: { id }, options: WITH_CONTACTS as any });
      if (!found) throw new NotFoundException('Không tìm thấy khách hàng');
      return found;
    });
  }

  async createCustomer(dto: CreateCustomerDto, actor: AuthUser) {
    return this.guard(async () => {
      const { contacts = [], ...raw } = dto;
      const data = this.normalize(raw);
      const code = await this.sequence.customerCode();
      const created = await this.customers.create({
        ...data,
        code,
        status: data.status,
        address: data.address ?? '',
        contacts: contacts.map((c) => this.toContact(c, !!data.anonymous)) as Contact[],
      });
      await this.audit.log(actor, 'Thêm khách hàng', `${created.code} · ${created.name}`);
      return this.get(created.id);
    });
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto, actor: AuthUser) {
    return this.guard(async () => {
      const queryRunner = await this.customers.startTransaction();
      try {
        const customer = await queryRunner.manager.findOne(Customer, { where: { id } });
        if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');

        const { contacts, ...raw } = dto;
        const data = this.normalize(raw);
        Object.assign(customer, data);
        await queryRunner.manager.save(Customer, customer);
        const anonymous = customer.anonymous;

        if (contacts) {
          const existing = await queryRunner.manager.find(Contact, { where: { customerId: id } });
          const existingIds = new Set(existing.map((c) => c.id));
          const keep = new Set<string>();
          for (const c of contacts) {
            if (c.id && isUUID(c.id) && existingIds.has(c.id)) {
              keep.add(c.id);
              await queryRunner.manager.update(Contact, c.id, this.toContact(c, anonymous));
            } else {
              await queryRunner.manager.save(Contact, queryRunner.manager.create(Contact, { ...this.toContact(c, anonymous), customerId: id }));
            }
          }
          const remove = existing.filter((c) => !keep.has(c.id)).map((c) => c.id);
          if (remove.length) await queryRunner.manager.delete(Contact, { id: In(remove) });
        }
        await this.customers.commitTransaction(queryRunner);
      } catch (error) {
        await this.customers.rollbackTransaction(queryRunner);
        throw error;
      }
      await this.audit.log(actor, 'Cập nhật khách hàng', `${id}`);
      return this.get(id);
    });
  }

  /**
   * Customers that already have contracts/invoices keep their history and must be set to inactive instead.
   * Administrators may still remove them: contracts, services, invoices and payments are soft-deleted with them.
   */
  async removeCustomer(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const customer = await this.customers.findByIdOrFail(id);
      const [contracts, invoices] = await Promise.all([
        this.dataSource.getRepository(Contract).find({ where: { customerId: id }, select: { id: true } }),
        this.dataSource.getRepository(Invoice).count({ where: { customerId: id } }),
      ]);
      const hasHistory = contracts.length + invoices > 0;
      if (hasHistory && actor.role !== ROLE.ADMIN) {
        throw new ConflictException('Khách hàng đã có hợp đồng/hóa đơn, không thể xóa. Hãy chuyển sang trạng thái "Ngừng hoạt động".');
      }
      await this.dataSource.transaction(async (m) => {
        await softDeleteContracts(m, contracts.map((c) => c.id));
        // Invoices not tied to a contract of this customer
        const orphans = await m.find(Invoice, { where: { customerId: id }, select: { id: true } });
        if (orphans.length) await m.softDelete(Invoice, { customerId: id });
        await m.delete(Contact, { customerId: id });
        await m.softDelete(Customer, id);
      });
      await this.audit.log(actor, 'Xóa khách hàng', `${customer.code} · ${customer.name}`);
    });
  }

  /** Anonymous customers only keep name, email and social accounts */
  private normalize<T extends Partial<CreateCustomerDto>>(data: T): T {
    return data.anonymous ? { ...data, taxCode: '', address: '', phone: '' } : data;
  }

  private toContact(c: ContactDto, anonymous = false) {
    return {
      name: c.name.trim(),
      position: anonymous ? '' : c.position ?? '',
      phone: anonymous ? '' : c.phone ?? '',
      email: c.email ?? '',
      telegram: c.telegram ?? '',
      zalo: c.zalo ?? '',
      facebook: c.facebook ?? '',
    };
  }
}
