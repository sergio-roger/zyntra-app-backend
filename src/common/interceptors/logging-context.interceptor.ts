import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@Injectable()
export class LoggingContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<RequestWithUser>();
      const user = req.user as
        | { id?: string; crm_user_id?: string; role?: string }
        | undefined;

      if (user?.id) {
        this.logger.assign({
          businessId: user.id,
          crmUserId: user.crm_user_id ?? undefined,
          role: user.role ?? undefined,
        });
      }
    }

    return next.handle();
  }
}
