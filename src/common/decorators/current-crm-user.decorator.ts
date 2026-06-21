import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@crm/enums/user-role.enum';

export interface CrmUserContext {
  id: string | null;
  role: UserRole;
}

export const CurrentCrmUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CrmUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return {
      id: request.user?.crm_user_id ?? null,
      role: request.user?.role ?? UserRole.ADMIN,
    };
  },
);
