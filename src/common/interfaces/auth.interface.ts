import { ROLE } from '../enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: ROLE;
}

/** Authenticated principal attached to request.user (reloaded from DB on every request) */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: ROLE;
}
