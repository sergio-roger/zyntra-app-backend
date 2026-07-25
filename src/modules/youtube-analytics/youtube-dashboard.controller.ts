import { Business } from '@auth/entities/business.entity';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('YouTube Analytics')
@ApiBearerAuth()
@Controller('youtube-analytics/dashboard')
export class YoutubeDashboardController {
  constructor(
    private readonly youtubeAnalyticsService: YoutubeAnalyticsService,
  ) {}

  @Get('own-channel')
  @ApiOperation({ summary: 'Stats diarias del canal propio (canal + videos)' })
  getOwnChannel(@CurrentBusiness() business: Business) {
    return this.youtubeAnalyticsService.getOwnChannelDashboard(business.id);
  }

  @Get('competitors')
  @ApiOperation({
    summary: 'Canales de competencia con sus últimos videos y métricas',
  })
  getCompetitors(@CurrentBusiness() business: Business) {
    return this.youtubeAnalyticsService.getCompetitorsDashboard(business.id);
  }
}
