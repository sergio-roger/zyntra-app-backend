import { REDIS_CLIENT } from '@common/redis/redis.constants';
import type { RequestWithWidgetSession } from '@/modules/widget-session/interfaces/request-with-widget-session.interface';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

@Injectable()
export class ChatRateLimitGuard implements CanActivate {
  private readonly max: number;
  private readonly windowSec: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.max = config.get<number>('CHAT_RATE_LIMIT_MAX', 20);
    this.windowSec = config.get<number>('CHAT_RATE_LIMIT_WINDOW_SEC', 60);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithWidgetSession>();

    // WidgetSessionGuard must run before this guard (see @UseGuards order on
    // the route) and always sets req.widgetSession or throws.
    if (!req.widgetSession) {
      throw new UnauthorizedException('widget session inválida o expirada');
    }

    const scope = req.widgetSession.channelId;
    const visitor = req.widgetSession.visitorFingerprint;
    const key = `ratelimit:chat:${scope}:${visitor}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, this.windowSec);
    }

    if (count > this.max) {
      throw new HttpException(
        'Demasiadas solicitudes, intenta de nuevo más tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
