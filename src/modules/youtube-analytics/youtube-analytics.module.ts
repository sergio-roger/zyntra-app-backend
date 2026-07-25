import { YoutubeAnalyticsController } from '@/modules/youtube-analytics/youtube-analytics.controller';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';
import { YoutubeDashboardController } from '@/modules/youtube-analytics/youtube-dashboard.controller';
import { YoutubeOAuthController } from '@/modules/youtube-analytics/youtube-oauth.controller';
import { YoutubeOAuthService } from '@/modules/youtube-analytics/youtube-oauth.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [
    YoutubeAnalyticsController,
    YoutubeOAuthController,
    YoutubeDashboardController,
  ],
  providers: [YoutubeAnalyticsService, YoutubeOAuthService],
  exports: [YoutubeAnalyticsService],
})
export class YoutubeAnalyticsModule {}
