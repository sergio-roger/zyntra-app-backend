import { Business } from '@auth/entities/business.entity';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';
import { YoutubeOAuthService } from '@/modules/youtube-analytics/youtube-oauth.service';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Public } from '@common/decorators/public.decorator';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiExcludeController()
@Controller('youtube-analytics/oauth')
export class YoutubeOAuthController {
  constructor(
    private readonly youtubeOAuthService: YoutubeOAuthService,
    private readonly youtubeAnalyticsService: YoutubeAnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  getStatus(@CurrentBusiness() business: Business) {
    return this.youtubeAnalyticsService.getOwnChannelStatus(business.id);
  }

  @Get('connect')
  connect(@CurrentBusiness() business: Business, @Res() res: Response) {
    return res.redirect(this.youtubeOAuthService.buildConsentUrl(business.id));
  }

  // Google redirige acá sin la cookie de sesión del negocio, así que esta ruta
  // no puede requerir auth de sesión — el businessId viaja en el state firmado.
  @Public()
  @Get('callback')
  async callback(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    if (error || !code || !state) {
      return res.redirect(this.buildFrontendRedirectUrl('error'));
    }

    try {
      const businessId =
        this.youtubeOAuthService.resolveBusinessIdFromState(state);
      const tokens = await this.youtubeOAuthService.exchangeCodeForTokens(code);
      await this.youtubeAnalyticsService.upsertOwnChannelCredentials(
        businessId,
        tokens,
      );
      await this.youtubeAnalyticsService.triggerInterestVideoScraping(businessId);
      return res.redirect(this.buildFrontendRedirectUrl('connected'));
    } catch {
      return res.redirect(this.buildFrontendRedirectUrl('error'));
    }
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentBusiness() business: Business) {
    return this.youtubeAnalyticsService.removeOwnChannelCredentials(
      business.id,
    );
  }

  private buildFrontendRedirectUrl(status: 'connected' | 'error'): string {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    return `${frontendUrl}/redes-sociales/youtube?youtube=${status}`;
  }
}
