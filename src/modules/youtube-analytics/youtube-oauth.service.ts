import { YOUTUBE_OAUTH_SCOPES } from '@/modules/youtube-analytics/constants/youtube-oauth-scopes.constant';
import { YoutubeOAuthTokens } from '@/modules/youtube-analytics/interfaces/youtube-oauth-tokens.interface';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

interface OAuthStatePayload {
  businessId: string;
}

@Injectable()
export class YoutubeOAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private buildClient(): OAuth2Client {
    return new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI'),
    );
  }

  // El state viaja por el navegador vía Google, así que se firma para que
  // no se pueda falsificar el businessId y secuestrar la conexión de otro negocio.
  buildConsentUrl(businessId: string): string {
    const state = this.jwtService.sign(
      { businessId } satisfies OAuthStatePayload,
      { expiresIn: '10m' },
    );
    return this.buildClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: YOUTUBE_OAUTH_SCOPES,
      state,
    });
  }

  resolveBusinessIdFromState(state: string): string {
    try {
      const payload = this.jwtService.verify<OAuthStatePayload>(state);
      return payload.businessId;
    } catch {
      throw new BadRequestException('El enlace de conexión con Google expiró o es inválido');
    }
  }

  async exchangeCodeForTokens(code: string): Promise<YoutubeOAuthTokens> {
    const { tokens } = await this.buildClient().getToken(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google no devolvió un refresh token; revocá el acceso previo en tu cuenta de Google e intentá de nuevo',
      );
    }

    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? undefined,
      scopes: tokens.scope ? tokens.scope.split(' ') : YOUTUBE_OAUTH_SCOPES,
    };
  }
}
