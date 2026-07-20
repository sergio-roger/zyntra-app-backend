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

@Injectable()
export class FormRateLimitGuard implements CanActivate {
  private readonly max: number;
  private readonly windowSec: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.max = config.get<number>('FORM_SUBMIT_RATE_LIMIT_MAX', 20);
    this.windowSec = config.get<number>('FORM_SUBMIT_RATE_LIMIT_WINDOW_SEC', 60);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const businessId = String(req.params.businessId);
    const slug = String(req.params.slug);

    await this.consume(businessId, slug, req.ip ?? 'unknown');

    return true;
  }

  async consume(businessId: string, slug: string, ip: string): Promise<void> {
    const key = `ratelimit:form-submit:${businessId}:${slug}:${ip}`;
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
  }
}
