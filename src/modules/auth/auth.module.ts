import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SettingsPermissionsController } from './settings-permissions.controller';
import { Business } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { PlanDescription } from './entities/plan-description.entity';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { Permission } from './entities/permission.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CrmUser } from '@crm/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Plan,
      PlanDescription,
      CrmUser,
      Role,
      Menu,
      Permission,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, SettingsPermissionsController],
  exports: [AuthService],
})
export class AuthModule {}
