import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUOTATION_STATUS, SERVICE_TYPE } from 'src/common/enum';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const emptyToNull = ({ value }) => (value === '' ? null : value);

export class QuotationItemDto {
  @ApiProperty({ enum: SERVICE_TYPE })
  @IsEnum(SERVICE_TYPE)
  type: SERVICE_TYPE;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  config?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  months?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;
}

export class QuotationCustomerInfoDto {
  @ApiProperty() @IsString() @MaxLength(300) name: string;
  @ApiProperty() @IsString() @MaxLength(500) address: string;
  @ApiProperty() @IsString() @MaxLength(50) phone: string;
  @ApiProperty() @IsString() @MaxLength(200) email: string;
}

export class SaveQuotationDto {
  @ApiPropertyOptional({ description: 'Empty when the quotation is for a one-off customerInfo' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  customerId?: string | null;

  @ApiProperty()
  @Matches(ISO, { message: 'Hiệu lực đến phải có dạng yyyy-mm-dd' })
  validUntil: string;

  @ApiProperty({ enum: QUOTATION_STATUS })
  @IsEnum(QUOTATION_STATUS)
  status: QUOTATION_STATUS;

  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(64)
  templateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vat?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  terms?: string[];

  @ApiPropertyOptional({ type: QuotationCustomerInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuotationCustomerInfoDto)
  customerInfo?: QuotationCustomerInfoDto;
}

export class SaveQuotationTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên template không được để trống' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vat?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  terms?: string[];
}
