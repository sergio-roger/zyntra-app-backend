import { REDIS_CLIENT } from '@common/redis/redis.constants';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type Redis from 'ioredis';

interface ChatRequestBody {
  channel_id?: string;
  business_id?: string;
  visitor?: { fingerprint?: string };
}

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
    const req = context.switchToHttp().getRequest<Request>();
    const body = (req.body ?? {}) as ChatRequestBody;

    const scope = body.channel_id ?? body.business_id;
    if (!scope) return true; // let DTO validation reject the missing id

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const visitor = body.visitor?.fingerprint ?? ip ?? 'anonymous';

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
