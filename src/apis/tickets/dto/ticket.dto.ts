import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from 'src/common/enum';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const emptyToNull = ({ value }) => (value === '' ? null : value);

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ enum: TICKET_CATEGORY })
  @IsEnum(TICKET_CATEGORY)
  category: TICKET_CATEGORY;

  @ApiProperty({ enum: TICKET_PRIORITY })
  @IsEnum(TICKET_PRIORITY)
  priority: TICKET_PRIORITY;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  customerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  contractId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, { message: 'Hạn hoàn thành phải có dạng yyyy-mm-dd' })
  dueDate?: string | null;

  @ApiPropertyOptional({ description: 'Direct assignment; leave empty to let a technician pick it up' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  assigneeId?: string | null;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUS })
  @IsOptional()
  @IsEnum(TICKET_STATUS)
  status?: TICKET_STATUS;

  @ApiPropertyOptional({ enum: TICKET_PRIORITY })
  @IsOptional()
  @IsEnum(TICKET_PRIORITY)
  priority?: TICKET_PRIORITY;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(ISO, { message: 'Hạn hoàn thành phải có dạng yyyy-mm-dd' })
  dueDate?: string | null;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  @MaxLength(5000)
  content: string;
}
