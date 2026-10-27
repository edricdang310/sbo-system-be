import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const UNITS = ['day', 'week', 'month', 'year'];
const CATEGORY_KEYS = ['customers', 'contracts', 'services', 'invoices', 'quotations', 'tickets', 'audit-logs'];

export class AutoDeleteRuleDto {
  @ApiProperty() @IsIn(CATEGORY_KEYS) category: any;
  @ApiProperty() @IsBoolean() enabled: boolean;

  @ApiProperty({ description: 'Run the clean-up every N units' })
  @IsInt() @Min(1) @Max(999)
  everyValue: number;
  @ApiProperty({ enum: UNITS }) @IsIn(UNITS) everyUnit: 'day' | 'week' | 'month' | 'year';

  @ApiProperty({ description: 'Only records older than N units are deleted' })
  @IsInt() @Min(1) @Max(999)
  olderValue: number;
  @ApiProperty({ enum: UNITS }) @IsIn(UNITS) olderUnit: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({ description: 'Only records in these statuses are deleted' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  statuses: string[];
}

export class SaveAutoDeleteDto {
  @ApiProperty({ type: [AutoDeleteRuleDto] })
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => AutoDeleteRuleDto)
  rules: AutoDeleteRuleDto[];
}

export class ConfirmDto {
  /** Must be the literal word RESET to guard against accidental calls */
  @ApiProperty() @IsString() confirm: string;
}
