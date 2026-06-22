import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@auth/auth.service';
import { JwtPayload } from '@auth/interfaces/jwt-payload.interface';
import { UserRole } from '@crm/enums/user-role.enum';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
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

  async validate(payload: JwtPayload) {
    const business = await this.authService.validateBusiness(payload.sub);
    if (!business) {
      throw new UnauthorizedException();
    }
    return {
      ...business,
      crm_user_id: payload.crm_user_id ?? null,
      role: payload.role ?? UserRole.ADMIN,
    };
  }
}
