import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skips JWT + permission checks (login, public quotation view...) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
