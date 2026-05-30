import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@auth/auth.service';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: (req: RequestWithUser) => {
        let token = null;
        if (req && req.session) {
          token = req.session.jwt;
        }
        return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const business = await this.authService.validateBusiness(payload.sub);
    if (!business) {
      throw new UnauthorizedException();
    }
    return business;
  }
}
