import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { WidgetSessionService } from './widget-session.service';
import { WidgetSessionGuard } from './widget-session.guard';

@Module({
  // No secret registered here — WidgetSessionService always passes
  // WIDGET_SESSION_JWT_SECRET explicitly per sign()/verify() call, so this
  // module's JwtService is never implicitly usable with the wrong secret.
  // ChannelsModule is needed by WidgetSessionGuard for the legacy
  // business_id/channel_id fallback (resolves the channel without a
  // public_key).
  imports: [JwtModule.register({}), ChannelsModule],
  providers: [WidgetSessionService, WidgetSessionGuard],
  exports: [WidgetSessionService, WidgetSessionGuard],
})
export class WidgetSessionModule {}
