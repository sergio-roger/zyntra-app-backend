import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithWidgetSession } from './interfaces/request-with-widget-session.interface';
import { WidgetSessionService } from './widget-session.service';

/**
 * Verifies the widget session token from x-widget-session and attaches the
 * decoded { businessId, channelId, visitorFingerprint } as req.widgetSession.
 * Downstream code must read tenant identity from req.widgetSession, never
 * from the request body/query.
 */
@Injectable()
export class WidgetSessionGuard implements CanActivate {
  constructor(private readonly widgetSessionService: WidgetSessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<RequestWithWidgetSession>();

    const token = req.headers['x-widget-session'];
    if (!token || Array.isArray(token)) {
      throw new UnauthorizedException('widget session inválida o expirada');
    }

    req.widgetSession = this.widgetSessionService.verify(token);
    return true;
  }
}
