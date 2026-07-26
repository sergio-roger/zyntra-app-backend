import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GenerateAuthUrlOptions } from '@/modules/youtube-analytics/interfaces/generate-auth-url-options.interface';
import { YoutubeOAuthService } from '@/modules/youtube-analytics/youtube-oauth.service';

const generateAuthUrlMock = jest.fn<string, [GenerateAuthUrlOptions]>();
const getTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: generateAuthUrlMock,
    getToken: getTokenMock,
  })),
}));

describe('YoutubeOAuthService', () => {
  let service: YoutubeOAuthService;
  let jwtService: JwtService;

  beforeEach(() => {
    generateAuthUrlMock.mockReset();
    getTokenMock.mockReset();

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client-id',
          GOOGLE_CLIENT_SECRET: 'client-secret',
          GOOGLE_OAUTH_REDIRECT_URI:
            'http://localhost:3000/api/youtube-analytics/oauth/callback',
          JWT_SECRET: 'test-jwt-secret',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    jwtService = new JwtService({ secret: 'test-jwt-secret' });
    service = new YoutubeOAuthService(configService, jwtService);
  });

  describe('buildConsentUrl', () => {
    it('requests offline access with the youtube read-only scopes and a signed state', () => {
      generateAuthUrlMock.mockReturnValue(
        'https://accounts.google.com/o/oauth2/auth?mock=1',
      );

      const url = service.buildConsentUrl('business-1');

      expect(url).toBe('https://accounts.google.com/o/oauth2/auth?mock=1');
      const [[options]] = generateAuthUrlMock.mock.calls;
      expect(options).toMatchObject({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/yt-analytics.readonly',
        ],
      });
      expect(
        jwtService.verify<{ businessId: string }>(options.state).businessId,
      ).toBe('business-1');
    });
  });

  describe('resolveBusinessIdFromState', () => {
    it('recovers the businessId from a state signed by this same service', () => {
      const state = jwtService.sign({ businessId: 'business-42' });
      expect(service.resolveBusinessIdFromState(state)).toBe('business-42');
    });

    it('rejects a tampered or expired state', () => {
      expect(() => service.resolveBusinessIdFromState('not-a-jwt')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('returns the refresh token, access token and scopes on success', async () => {
      getTokenMock.mockResolvedValue({
        tokens: {
          refresh_token: 'refresh-abc',
          access_token: 'access-xyz',
          scope:
            'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
        },
      });

      const result = await service.exchangeCodeForTokens('auth-code');

      expect(result).toEqual({
        refreshToken: 'refresh-abc',
        accessToken: 'access-xyz',
        scopes: [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/yt-analytics.readonly',
        ],
      });
    });

    it('throws when Google does not return a refresh_token (already granted without prompt=consent)', async () => {
      getTokenMock.mockResolvedValue({
        tokens: { access_token: 'access-only' },
      });

      await expect(service.exchangeCodeForTokens('auth-code')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
