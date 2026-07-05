import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@crm/enums/user-role.enum';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

export interface UserContext {
  id: string | null;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return {
      id: request.user?.id ?? null,
      role: request.user?.role ?? UserRole.ADMIN,
    };
  },
);
