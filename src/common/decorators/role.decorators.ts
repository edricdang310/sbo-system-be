import { SetMetadata } from '@nestjs/common';
import { PERMISSION } from '../enum';

export const ROLES_KEY = 'roles';
/** Required permission(s); the user needs at least one of them (nail_store convention) */
export const Roles = (...permissions: PERMISSION[]) => SetMetadata(ROLES_KEY, permissions);
