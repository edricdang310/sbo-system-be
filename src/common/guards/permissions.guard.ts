import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/role.decorators';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission, PERMISSION } from '../enum';

/** Enforces @Roles() against the static RBAC matrix (REQUIREMENTS §2). Runs after JwtAuthGuard. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<PERMISSION[]>(ROLES_KEY, targets);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Bạn chưa đăng nhập');

    if (required.some((permission) => hasPermission(user.role, permission))) return true;
    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
  }
}
