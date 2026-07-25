import { Business } from '@auth/entities/business.entity';
import { CreateCompetitorChannelDto } from '@/modules/youtube-analytics/dto/create-competitor-channel.dto';
import {
  YoutubeCompetitorsDashboard,
  YoutubeOwnChannelDashboard,
} from '@/modules/youtube-analytics/interfaces/youtube-dashboard.interface';
import { YoutubeCompetitorChannel } from '@/modules/youtube-analytics/interfaces/youtube-competitor-channel.interface';
import { YoutubeOAuthTokens } from '@/modules/youtube-analytics/interfaces/youtube-oauth-tokens.interface';
import { YoutubeOwnChannelStatus } from '@/modules/youtube-analytics/interfaces/youtube-own-channel-status.interface';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class YoutubeAnalyticsService {
  private readonly logger = new Logger(YoutubeAnalyticsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    const url = this.configService.get<string>('YOUTUBE_SERVICE_URL');
    if (!url) throw new Error('YOUTUBE_SERVICE_URL env var not set');
    return url;
  }

  private get headers(): Record<string, string> {
    return {
      'x-service-token': this.configService.get<string>('SERVICE_TOKEN', ''),
    };
  }

  async listCompetitors(
    business: Business,
  ): Promise<YoutubeCompetitorChannel[]> {
    const url = `${this.baseUrl}/internal/competitors/${business.id}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<YoutubeCompetitorChannel[]>(url, {
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logError('listing youtube competitor channels', error);
      throw this.serviceUnavailable();
    }
  }

  async createCompetitor(
    business: Business,
    dto: CreateCompetitorChannelDto,
  ): Promise<YoutubeCompetitorChannel> {
    const url = `${this.baseUrl}/internal/competitors/${business.id}`;
    const competitorLimit = business.plan_object?.youtubeCompetitorLimit ?? 0;

    try {
      const response = await firstValueFrom(
        this.httpService.post<YoutubeCompetitorChannel>(
          url,
          { ...dto, competitorLimit },
          { headers: this.headers },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logError('creating youtube competitor channel', error);
      throw this.mapPlanLimitOrUnavailable(error);
    }
  }

  async removeCompetitor(business: Business, id: string): Promise<void> {
    const url = `${this.baseUrl}/internal/competitors/${business.id}/${id}`;

    try {
      await firstValueFrom(
        this.httpService.delete(url, { headers: this.headers }),
      );
    } catch (error: unknown) {
      this.logError('removing youtube competitor channel', error);
      if (this.getAxiosStatus(error) === 404) {
        throw new NotFoundException('Canal de competencia no encontrado');
      }
      throw this.serviceUnavailable();
    }
  }

  async upsertOwnChannelCredentials(
    businessId: string,
    tokens: YoutubeOAuthTokens,
  ): Promise<void> {
    const url = `${this.baseUrl}/internal/channels/${businessId}/credentials`;

    try {
      await firstValueFrom(
        this.httpService.put(url, tokens, { headers: this.headers }),
      );
    } catch (error: unknown) {
      this.logError('upserting own youtube channel credentials', error);
      throw this.serviceUnavailable();
    }
  }

  async removeOwnChannelCredentials(businessId: string): Promise<void> {
    const url = `${this.baseUrl}/internal/channels/${businessId}/credentials`;

    try {
      await firstValueFrom(
        this.httpService.delete(url, { headers: this.headers }),
      );
    } catch (error: unknown) {
      this.logError('removing own youtube channel credentials', error);
      if (this.getAxiosStatus(error) === 404) return;
      throw this.serviceUnavailable();
    }
  }

  async getOwnChannelStatus(
    businessId: string,
  ): Promise<YoutubeOwnChannelStatus | null> {
    const url = `${this.baseUrl}/internal/channels/${businessId}/credentials/status`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<YoutubeOwnChannelStatus | null>(url, {
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logError('getting own youtube channel status', error);
      throw this.serviceUnavailable();
    }
  }

  async getOwnChannelDashboard(
    businessId: string,
  ): Promise<YoutubeOwnChannelDashboard> {
    const url = `${this.baseUrl}/internal/dashboard/${businessId}/own-channel`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<YoutubeOwnChannelDashboard>(url, {
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logError('getting own youtube channel dashboard', error);
      throw this.serviceUnavailable();
    }
  }

  async getCompetitorsDashboard(
    businessId: string,
  ): Promise<YoutubeCompetitorsDashboard> {
    const url = `${this.baseUrl}/internal/dashboard/${businessId}/competitors`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<YoutubeCompetitorsDashboard>(url, {
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logError('getting youtube competitors dashboard', error);
      throw this.serviceUnavailable();
    }
  }

  private mapPlanLimitOrUnavailable(error: unknown): Error {
    const status = this.getAxiosStatus(error);
    if (status === HttpStatus.PAYMENT_REQUIRED) {
      const data = axios.isAxiosError(error) ? error.response?.data : null;
      return new HttpException(data, HttpStatus.PAYMENT_REQUIRED);
    }
    return this.serviceUnavailable();
  }

  private getAxiosStatus(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
  }

  private serviceUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'El servicio de YouTube Analytics no está disponible, intenta de nuevo en unos segundos',
    );
  }

  private logError(action: string, error: unknown): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const msg = axios.isAxiosError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
    this.logger.error(`Error ${action}: ${msg}`, stack);
  }
}
