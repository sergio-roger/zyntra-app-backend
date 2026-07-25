import { Business } from '@auth/entities/business.entity';
import { CreateCompetitorChannelDto } from '@/modules/youtube-analytics/dto/create-competitor-channel.dto';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('YouTube Analytics')
@ApiBearerAuth()
@Controller('youtube-analytics/competitors')
export class YoutubeAnalyticsController {
  constructor(
    private readonly youtubeAnalyticsService: YoutubeAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los canales de competencia monitoreados' })
  list(@CurrentBusiness() business: Business) {
    return this.youtubeAnalyticsService.listCompetitors(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Agrega un canal de competencia (respeta el límite del plan)',
  })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateCompetitorChannelDto,
  ) {
    return this.youtubeAnalyticsService.createCompetitor(business, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deja de monitorear un canal de competencia' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.youtubeAnalyticsService.removeCompetitor(business, id);
  }
}
