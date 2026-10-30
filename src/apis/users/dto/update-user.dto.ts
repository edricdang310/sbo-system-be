import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/** Account info only. Passwords are changed exclusively through POST /users/:id/reset-password (or /auth/change-password for yourself). */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
