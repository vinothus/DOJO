import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const roles = req.user?.roles ?? [];
    const ok = required.some((r) => roles.includes(r));
    if (!ok) {
      const need = required.join(' or ');
      const have = roles.length ? roles.join(', ') : 'none';
      throw new ForbiddenException(
        `This action requires role: ${need}. Your roles: ${have}.`,
      );
    }
    return true;
  }
}
