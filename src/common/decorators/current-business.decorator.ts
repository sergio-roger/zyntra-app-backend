import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Business } from '@auth/entities/business.entity';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

export const CurrentBusiness = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Business => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);
