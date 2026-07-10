import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WidgetSessionPayload } from './interfaces/widget-session-payload.interface';

/**
 * Signs/verifies the widget's short-lived session JWT with a secret separate
 * from JWT_SECRET (staff/user login) and SERVICE_TOKEN (agent callback) — a
 * leaked widget token must not be replayable against those.
 */
@Injectable()
export class WidgetSessionService {
  static readonly EXPIRES_IN_SECONDS = 1200;
  private static readonly EXPIRES_IN = '20m';

  private readonly secret: string;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('WIDGET_SESSION_JWT_SECRET', '');
    if (!this.secret) {
      throw new Error('WIDGET_SESSION_JWT_SECRET no está configurado');
    }
  }

  sign(payload: Omit<WidgetSessionPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: WidgetSessionService.EXPIRES_IN,
    });
  }

  verify(token: string): WidgetSessionPayload {
    try {
      return this.jwtService.verify<WidgetSessionPayload>(token, {
        secret: this.secret,
      });
    } catch {
      throw new UnauthorizedException('widget session inválida o expirada');
    }
  }
}
