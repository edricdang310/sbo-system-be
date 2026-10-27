import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLE } from 'src/common/enum';

const lower = ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @Transform(lower)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ enum: ROLE })
  @IsEnum(ROLE, { message: 'Vai trò không hợp lệ' })
  role: ROLE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Bỏ trống để hệ thống tự sinh mật khẩu tạm' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  password?: string;
}
