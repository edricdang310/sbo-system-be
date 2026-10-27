import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'Mật khẩu mới. Bỏ trống để hệ thống tự sinh ngẫu nhiên' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  password?: string;
}
