import { Business } from '@auth/entities/business.entity';
import { SaveVideoInterestSelectionDto } from '@/modules/youtube-analytics/dto/save-video-interest-selection.dto';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('YouTube Analytics')
@ApiBearerAuth()
@Controller('youtube-analytics/interests')
export class VideoInterestsController {
  constructor(
    private readonly youtubeAnalyticsService: YoutubeAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de intereses de contenido para elegir antes de conectar' })
  list() {
    return this.youtubeAnalyticsService.getVideoInterests();
  }

  @Put('selection')
  @ApiOperation({ summary: 'Guarda la selección de intereses del business (mínimo 3)' })
  saveSelection(
    @CurrentBusiness() business: Business,
    @Body() dto: SaveVideoInterestSelectionDto,
  ) {
    return this.youtubeAnalyticsService.saveVideoInterestSelection(
      business.id,
      dto.interestIds,
    );
  }
}
