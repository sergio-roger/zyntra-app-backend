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
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      ...user,
      business: user.business,
      plan_id: user.business.plan_id,
      plan_status: user.business.plan_status,
      role: payload.role ?? UserRole.ADMIN,
    };
  }
}
