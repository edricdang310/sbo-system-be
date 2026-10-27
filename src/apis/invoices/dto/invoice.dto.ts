import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  Max,
} from 'class-validator';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoMsg = (f: string) => ({ message: `${f} phải có dạng yyyy-mm-dd` });
const emptyToUndefined = ({ value }) => (value === '' ? undefined : value);

/** Only what the server cannot derive; amounts, periods and snapshots are recomputed from the service */
export class InvoiceItemInputDto {
  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Start of the billed window; defaults to the day after paidUntil' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(ISO, isoMsg('from'))
  from?: string;

  @ApiPropertyOptional({ description: 'Number of billing cycles (default 1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  cycles?: number;

  @ApiPropertyOptional({ description: 'Alternative to cycles: total months (must be a multiple of the cycle)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'Hợp đồng không hợp lệ' })
  contractId: string;

  @ApiProperty({ example: 'Tháng 10/2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  period: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(ISO, isoMsg('periodFrom'))
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(ISO, isoMsg('periodTo'))
  periodTo?: string;

  @ApiProperty()
  @Matches(ISO, isoMsg('Ngày phát hành'))
  issueDate: string;

  @ApiProperty()
  @Matches(ISO, isoMsg('Hạn thanh toán'))
  dueDate: string;

  @ApiProperty({ type: [InvoiceItemInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Hóa đơn cần ít nhất một dịch vụ' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items: InvoiceItemInputDto[];
}

export class AttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  /** data URL for new uploads, or a URL previously returned by this API */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class CreatePaymentDto {
  @ApiProperty()
  @Matches(ISO, isoMsg('Ngày thanh toán'))
  paidAt: string;

  @ApiProperty()
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(0.01, { message: 'Số tiền phải lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({ enum: ['VND', 'USD', 'USDT'], description: 'Currency actually paid in; amount stays the VND equivalent' })
  @IsOptional()
  @IsIn(['VND', 'USD', 'USDT'])
  currency?: string;

  @ApiPropertyOptional({ description: 'Amount in `currency` as paid' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalAmount?: number;

  @ApiPropertyOptional({ description: 'VND per 1 unit of `currency`' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bank?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  methodName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class SettleInvoiceDto {
  @ApiPropertyOptional({ description: 'Reason, e.g. exchange-rate difference' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AddAttachmentsDto {
  @ApiProperty({ type: [AttachmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  files: AttachmentDto[];
}

export class SendTelegramDto {
  @ApiPropertyOptional({ description: 'Custom message; defaults to the configured template' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  attachPdf?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  attachQr?: boolean;
}
