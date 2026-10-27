import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'model'] })
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}

export class ChatDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  /** `chat` adds business data to the prompt (filtered by the caller's permissions); `quotation` only helps writing */
  @ApiPropertyOptional({ enum: ['chat', 'quotation'], default: 'chat' })
  @IsOptional()
  @IsIn(['chat', 'quotation'])
  mode?: 'chat' | 'quotation';
}
