import { REDIS_CLIENT } from '@common/redis/redis.constants';
import { ChannelsService } from '@/modules/channels/channels.service';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { RequestWithWidgetSession } from './interfaces/request-with-widget-session.interface';
import { WidgetSessionService } from './widget-session.service';

/**
 * Verifies the widget session token from x-widget-session and attaches the
 * decoded { businessId, channelId, visitorFingerprint } as req.widgetSession.
 * Downstream code must read tenant identity from req.widgetSession, never
 * from the request body/query.
 *
 * Falls back to the legacy business_id/channel_id body fields when the
 * header is absent, so snippets installed before the public_key/session
 * flow keep working. The fallback is logged and counted in Redis so it can
 * be surfaced to the business as a "update your widget" nudge.
 */
@Injectable()
export class WidgetSessionGuard implements CanActivate {
  private readonly logger = new Logger(WidgetSessionGuard.name);

  constructor(
    private readonly widgetSessionService: WidgetSessionService,
    private readonly channelsService: ChannelsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithWidgetSession>();

    const token = req.headers['x-widget-session'];
    if (token && !Array.isArray(token)) {
      req.widgetSession = this.widgetSessionService.verify(token);
      return true;
    }

    const legacyBusinessId = req.body?.business_id;
    const legacyChannelId = req.body?.channel_id;
    if (
      typeof legacyBusinessId === 'string' &&
      typeof legacyChannelId === 'string'
    ) {
      const channel = await this.channelsService.findOne(
        legacyBusinessId,
        legacyChannelId,
      );

      this.logger.warn(
        `legacy_widget_auth_used business_id=${legacyBusinessId} channel_id=${channel.id}`,
      );
      await this.redis.incr(`legacy_widget_usage:${legacyBusinessId}`);

      const nowSec = Math.floor(Date.now() / 1000);
      req.widgetSession = {
        businessId: channel.businessId,
        channelId: channel.id,
        visitorFingerprint: `legacy:${req.ip ?? 'unknown'}`,
        iat: nowSec,
        exp: nowSec + WidgetSessionService.EXPIRES_IN_SECONDS,
        legacy: true,
      };
      return true;
    }

    throw new UnauthorizedException('widget session inválida o expirada');
  }
}
