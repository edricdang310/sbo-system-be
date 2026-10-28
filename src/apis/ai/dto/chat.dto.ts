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

  /** `chat` adds business data to the prompt; `quotation` helps writing; `test` is for diagnostics in settings */
  @ApiPropertyOptional({ enum: ['chat', 'quotation', 'test'], default: 'chat' })
  @IsOptional()
  @IsIn(['chat', 'quotation', 'test'])
  mode?: 'chat' | 'quotation' | 'test';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
