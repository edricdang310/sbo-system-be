import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CURRENCY, PAYMENT_METHOD_KIND } from 'src/common/enum';

/** Empty, an image data URL, or an http(s) link (blocks javascript: and other schemes) */
const IMAGE_REF = /^(|data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+|https?:\/\/\S+)$/;
const imageMsg = { message: 'Ảnh phải là data URL ảnh hoặc liên kết http(s)' };
const MAX_IMAGE = 3_000_000;

export class CompanySettingsDto {
  @ApiProperty() @IsString() @MaxLength(300) companyName: string;
  @ApiProperty() @IsString() @MaxLength(50) taxCode: string;
  @ApiProperty() @IsString() @MaxLength(500) address: string;
  @ApiProperty() @IsString() @MaxLength(50) phone: string;
  @ApiProperty() @IsString() @MaxLength(200) email: string;
  @ApiProperty() @IsString() @MaxLength(MAX_IMAGE) @Matches(IMAGE_REF, imageMsg) logoUrl: string;
  @ApiProperty() @IsString() @MaxLength(200) bankName: string;
  @ApiProperty() @IsString() @MaxLength(100) bankAccount: string;
  @ApiProperty() @IsString() @MaxLength(200) bankHolder: string;
}

export class PaymentMethodDto {
  @ApiProperty({ enum: PAYMENT_METHOD_KIND })
  @IsEnum(PAYMENT_METHOD_KIND)
  kind: PAYMENT_METHOD_KIND;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) holder?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(300) account: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) network?: string;

  @ApiPropertyOptional({ description: 'VND per 1 coin (crypto only)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_IMAGE)
  @Matches(IMAGE_REF, imageMsg)
  qrUrl?: string;

  @ApiProperty({ enum: CURRENCY, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CURRENCY, { each: true })
  currencies: CURRENCY[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @ApiProperty() @IsBoolean() active: boolean;
}

export class InvoiceTemplateDto {
  @ApiProperty() @IsString() @MaxLength(100) title: string;
  @ApiProperty({ enum: ['landscape', 'portrait'] }) @IsIn(['landscape', 'portrait']) orientation: 'landscape' | 'portrait';
  @ApiProperty() @IsHexColor() accentColor: string;
  @ApiProperty() @IsBoolean() showCompany: boolean;
  @ApiProperty() @IsBoolean() showLogo: boolean;
  @ApiProperty() @IsBoolean() showCustomer: boolean;
  @ApiProperty() @IsBoolean() showPayment: boolean;
  @ApiProperty() @IsBoolean() showQr: boolean;
  @ApiProperty() @IsBoolean() showSignature: boolean;
  @ApiProperty() @IsString() @MaxLength(100) signatureLeft: string;
  @ApiProperty() @IsString() @MaxLength(100) signatureRight: string;
  @ApiProperty() @IsString() @MaxLength(1000) footerNote: string;
}

export class ExchangeRatesDto {
  @ApiProperty() @IsNumber() @Min(0) USD: number;
  @ApiProperty() @IsNumber() @Min(0) USDT: number;
}

export class TelegramSettingsDto {
  /** Masked values (starting with •) mean "unchanged" */
  @ApiProperty() @IsString() @MaxLength(200) botToken: string;
  @ApiProperty() @IsString() @MaxLength(100) botUsername: string;
  @ApiProperty() @IsBoolean() enabled: boolean;
  @ApiProperty() @IsInt() @Min(0) @Max(60) remindDaysBefore: number;
  @ApiProperty() @IsBoolean() autoSendInvoice: boolean;
  @ApiProperty() @IsString() @MaxLength(4000) template: string;
}

export class AiSettingsDto {
  /** Masked values (starting with •) mean "unchanged" */
  @ApiProperty() @IsString() @MaxLength(300) geminiApiKey: string;
  @ApiProperty() @IsString() @Matches(/^[\w.\-]+$/, { message: 'Tên model không hợp lệ' }) @MaxLength(100) model: string;
  @ApiProperty() @IsBoolean() enableQuotationAssist: boolean;
  @ApiProperty() @IsBoolean() enableChatAssistant: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) provider?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(2) temperature?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) @Max(32000) maxTokens?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) systemPrompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastCheckedAt?: string;
}
