import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { BaseServiceAbstract } from 'src/common/services/base.abstract.service';
import { SequenceService } from 'src/common/sequence/sequence.service';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { assertIsoDate } from 'src/common/utils/date.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Customer } from '../customers/entities/customer.entity';
import { SettingsService } from '../settings/settings.service';
import { Quotation } from './entities/quotation.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { QuotationRepository } from './repositories/quotation.repository';
import { QuotationTemplateRepository } from './repositories/quotation-template.repository';
import { SaveQuotationDto, SaveQuotationTemplateDto } from './dto/quotation.dto';

const newToken = () => randomBytes(24).toString('base64url');

@Injectable()
export class QuotationsService extends BaseServiceAbstract<Quotation> {
  constructor(
    private readonly quotations: QuotationRepository,
    private readonly templates: QuotationTemplateRepository,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly sequence: SequenceService,
    private readonly settings: SettingsService,
    private readonly audit: AuditLogsService,
  ) {
    super(quotations);
  }

  list() {
    return this.guard(() => this.quotations.find({ options: { order: { createdAt: 'DESC' } } }));
  }

  private async assertRefs(dto: SaveQuotationDto) {
    assertIsoDate(dto.validUntil, 'Hiệu lực đến');
    if (!dto.customerId && !dto.customerInfo) {
      throw new BadRequestException('Cần chọn khách hàng hoặc nhập thông tin khách hàng');
    }
    if (dto.customerId && !(await this.customers.exist({ where: { id: dto.customerId } }))) {
      throw new BadRequestException('Khách hàng không tồn tại');
    }
  }

  private fields(dto: SaveQuotationDto) {
    return {
      customerId: dto.customerId ?? null,
      validUntil: dto.validUntil,
      status: dto.status,
      items: dto.items.map((i) => ({ ...i, config: i.config ?? '' })),
      note: dto.note,
      templateId: dto.templateId ?? null,
      vat: dto.vat ?? 0,
      terms: dto.terms ?? [],
      customerInfo: dto.customerInfo ?? null,
    };
  }

  createQuotation(dto: SaveQuotationDto, actor: AuthUser) {
    return this.guard(async () => {
      await this.assertRefs(dto);
      const created = await this.quotations.create({
        ...this.fields(dto),
        code: await this.sequence.quotationCode(),
        shareToken: newToken(),
        createdBy: actor.name,
      } as any);
      await this.audit.log(actor, 'Tạo báo giá', created.code);
      return created;
    });
  }

  updateQuotation(id: string, dto: SaveQuotationDto, actor: AuthUser) {
    return this.guard(async () => {
      await this.assertRefs(dto);
      const updated = await this.quotations.updateByIdOrFail(id, this.fields(dto) as any);
      await this.audit.log(actor, 'Cập nhật báo giá', updated.code);
      return updated;
    });
  }

  removeQuotation(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const removed = await this.quotations.softDeleteOrFail(id);
      await this.audit.log(actor, 'Xóa báo giá', removed.code);
    });
  }

  /** Public (no login) view reached through the unguessable share token */
  publicView(token: string) {
    return this.guard(async () => {
      const q = await this.quotations.findOne({ filter: { shareToken: token } });
      if (!q) throw new NotFoundException('Báo giá không tồn tại hoặc đã bị xóa');
      const customer = q.customerId ? await this.customers.findOne({ where: { id: q.customerId } }) : null;
      const company: any = await this.settings.company();
      const { shareToken: _s, createdBy: _c, ...quotation } = q;
      return {
        quotation,
        customer: customer ? { name: customer.name, address: customer.address, taxCode: customer.taxCode } : null,
        company: {
          companyName: company.companyName,
          taxCode: company.taxCode,
          address: company.address,
          phone: company.phone,
          email: company.email,
          logoUrl: company.logoUrl,
        },
      };
    });
  }

  /* ---------- templates ---------- */

  listTemplates() {
    return this.guard(() => this.templates.find({ options: { order: { createdAt: 'ASC' } } }));
  }

  private templateFields(dto: SaveQuotationTemplateDto) {
    return {
      name: dto.name.trim(),
      description: dto.description ?? '',
      items: dto.items.map((i) => ({ ...i, config: i.config ?? '' })),
      vat: dto.vat ?? 0,
      terms: dto.terms ?? [],
    };
  }

  createTemplate(dto: SaveQuotationTemplateDto, actor: AuthUser) {
    return this.guard(async () => {
      const created = await this.templates.create(this.templateFields(dto) as any);
      await this.audit.log(actor, 'Tạo template báo giá', created.name);
      return created;
    });
  }

  updateTemplate(id: string, dto: SaveQuotationTemplateDto, actor: AuthUser) {
    return this.guard(async () => {
      const updated = await this.templates.updateByIdOrFail(id, this.templateFields(dto) as any);
      await this.audit.log(actor, 'Cập nhật template báo giá', updated.name);
      return updated;
    });
  }

  removeTemplate(id: string, actor: AuthUser) {
    return this.guard(async () => {
      const removed = await this.templates.softDeleteOrFail(id);
      await this.audit.log(actor, 'Xóa template báo giá', removed.name);
    });
  }
}
