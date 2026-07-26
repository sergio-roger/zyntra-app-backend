/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Business } from '@auth/entities/business.entity';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { YoutubeAnalyticsService } from '@/modules/youtube-analytics/youtube-analytics.service';

function axiosError(status: number, data?: unknown) {
  const error = new Error('Request failed') as Error & {
    isAxiosError: boolean;
    response: { status: number; data?: unknown };
  };
  error.isAxiosError = true;
  error.response = { status, data };
  return error;
}

describe('YoutubeAnalyticsService', () => {
  let service: YoutubeAnalyticsService;
  let httpService: jest.Mocked<HttpService>;

  const business = {
    id: 'business-1',
    plan_object: { youtubeCompetitorLimit: 3 },
  } as Business;

  beforeEach(async () => {
    const httpMock = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    const configMock = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'YOUTUBE_SERVICE_URL') return 'http://localhost:3003';
        if (key === 'SERVICE_TOKEN') return 'test-token';
        return fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YoutubeAnalyticsService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get(YoutubeAnalyticsService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  describe('listCompetitors', () => {
    it('returns the competitors from youtube-service', async () => {
      const data = [{ id: '1', channelHandleOrUrl: '@a' }];
      httpService.get.mockReturnValue(
        of({ data: { success: true, message: '', data, errors: [] } } as any),
      );

      await expect(service.listCompetitors(business)).resolves.toEqual(data);
    });

    it('degrades to ServiceUnavailableException on network failure', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED')),
      );

      await expect(service.listCompetitors(business)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('createCompetitor', () => {
    it('sends the plan competitor limit resolved from business.plan_object', async () => {
      httpService.post.mockReturnValue(
        of({
          data: { success: true, message: '', data: { id: 'new' }, errors: [] },
        } as any),
      );

      await service.createCompetitor(business, {
        channelHandleOrUrl: '@competitor',
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/internal/competitors/business-1',
        { channelHandleOrUrl: '@competitor', competitorLimit: 3 },
        { headers: { 'x-service-token': 'test-token' } },
      );
    });

    it('propagates a 402 plan_limit_reached as HttpException', async () => {
      httpService.post.mockReturnValue(
        throwError(() =>
          axiosError(402, { code: 'plan_limit_reached', limit: 3 }),
        ),
      );

      await expect(
        service.createCompetitor(business, { channelHandleOrUrl: '@d' }),
      ).rejects.toThrow(HttpException);
    });

    it('degrades unrelated failures to ServiceUnavailableException', async () => {
      httpService.post.mockReturnValue(throwError(() => axiosError(500)));

      await expect(
        service.createCompetitor(business, { channelHandleOrUrl: '@d' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('removeCompetitor', () => {
    it('maps a 404 from youtube-service to NotFoundException', async () => {
      httpService.delete.mockReturnValue(throwError(() => axiosError(404)));

      await expect(
        service.removeCompetitor(business, 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves when youtube-service confirms deletion', async () => {
      httpService.delete.mockReturnValue(of({ data: undefined } as any));

      await expect(
        service.removeCompetitor(business, 'existing-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getVideoInterests', () => {
    it('returns the catalog from youtube-service', async () => {
      const data = [{ id: '1', slug: 'gaming', name: 'Gaming' }];
      httpService.get.mockReturnValue(
        of({ data: { success: true, message: '', data, errors: [] } } as any),
      );

      await expect(service.getVideoInterests()).resolves.toEqual(data);
    });
  });

  describe('saveVideoInterestSelection', () => {
    it('PUTs the selection to youtube-service', async () => {
      httpService.put.mockReturnValue(of({ data: undefined } as any));

      await service.saveVideoInterestSelection('business-1', ['a', 'b', 'c']);

      expect(httpService.put).toHaveBeenCalledWith(
        'http://localhost:3003/internal/video-interests/business-1/selection',
        { interestIds: ['a', 'b', 'c'] },
        { headers: { 'x-service-token': 'test-token' } },
      );
    });
  });

  describe('getInterestVideos', () => {
    it('returns the scraped videos from youtube-service', async () => {
      const data = [{ id: 'v1', videoId: 'vid-1' }];
      httpService.get.mockReturnValue(
        of({ data: { success: true, message: '', data, errors: [] } } as any),
      );

      await expect(service.getInterestVideos('business-1')).resolves.toEqual(data);
    });
  });

  describe('triggerInterestVideoScraping', () => {
    it('fires the scraping request without throwing on failure', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED')),
      );

      await expect(
        service.triggerInterestVideoScraping('business-1'),
      ).resolves.toBeUndefined();
    });

    it('POSTs to the trigger endpoint on success', async () => {
      httpService.post.mockReturnValue(of({ data: undefined } as any));

      await service.triggerInterestVideoScraping('business-1');

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/internal/interest-videos/business-1',
        {},
        { headers: { 'x-service-token': 'test-token' } },
      );
    });
  });
});
