import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { BILLING_CYCLE, PAYMENT_TYPE, SERVICE_STATUS, SERVICE_TYPE } from 'src/common/enum';

/** Empty strings from the form mean "not set" */
const emptyToNull = ({ value }) => (value === '' ? null : value);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoMsg = (f: string) => ({ message: `${f} phải có dạng yyyy-mm-dd` });

export class CreateContractDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'Khách hàng không hợp lệ' })
  customerId: string;

  @ApiProperty({ enum: BILLING_CYCLE })
  @IsEnum(BILLING_CYCLE)
  billingCycle: BILLING_CYCLE;

  @ApiProperty({ enum: SERVICE_TYPE })
  @IsEnum(SERVICE_TYPE)
  serviceType: SERVICE_TYPE;

  @ApiPropertyOptional({ enum: SERVICE_TYPE, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SERVICE_TYPE, { each: true })
  serviceGroups?: SERVICE_TYPE[];

  @ApiProperty({ enum: PAYMENT_TYPE })
  @IsEnum(PAYMENT_TYPE)
  paymentType: PAYMENT_TYPE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/** Fields chosen when the contract was created; any of them can be corrected later */
export class UpdateContractDto extends PartialType(OmitType(CreateContractDto, ['serviceGroups'] as const)) {}

export class AddServiceGroupDto {
  @ApiProperty({ enum: SERVICE_TYPE })
  @IsEnum(SERVICE_TYPE)
  type: SERVICE_TYPE;
}

export class SaveServiceDto {
  @ApiProperty({ enum: SERVICE_TYPE })
  @IsEnum(SERVICE_TYPE)
  type: SERVICE_TYPE;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  @MaxLength(300)
  name: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  config?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  portalAccount?: string;

  @ApiProperty()
  @IsNumber({}, { message: 'Đơn giá phải là số' })
  @Min(0)
  unitPrice: number;

  @ApiProperty()
  @IsNumber({}, { message: 'Số lượng phải là số' })
  @Min(0.01, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, isoMsg('Ngày khởi tạo'))
  createdDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, isoMsg('Ngày bắt đầu'))
  startDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, isoMsg('Ngày hết hạn'))
  endDate?: string | null;

  @ApiPropertyOptional({ enum: BILLING_CYCLE, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsEnum(BILLING_CYCLE)
  billingCycle?: BILLING_CYCLE | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, isoMsg('Ngày đã trả đến'))
  paidUntil?: string | null;
}

export class SetServiceStatusDto {
  @ApiProperty({ enum: SERVICE_STATUS })
  @IsEnum(SERVICE_STATUS)
  status: SERVICE_STATUS;

  /** Effective date (yyyy-mm-dd or ISO date-time) */
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.slice(0, 10) : value))
  @Matches(ISO, isoMsg('Ngày'))
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
