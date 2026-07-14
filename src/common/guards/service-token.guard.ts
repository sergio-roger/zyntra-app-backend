import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Protege endpoints internos service-to-service (ej. /internal/*), siguiendo
// el mismo patrón de header que ya usa internal-callback.controller.ts:
// x-service-token comparado contra la env var SERVICE_TOKEN.
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-service-token'];
    const expected = this.configService.get<string>('SERVICE_TOKEN', '');

    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
