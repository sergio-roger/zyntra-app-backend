import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@auth/auth.service';
import { AuthController } from '@auth/auth.controller';
import { SettingsPermissionsController } from '@auth/settings-permissions.controller';
import { Business } from '@auth/entities/business.entity';
import { Plan } from '@auth/entities/plan.entity';
import { PlanDescription } from '@auth/entities/plan-description.entity';
import { Role } from '@auth/entities/role.entity';
import { Menu } from '@auth/entities/menu.entity';
import { Permission } from '@auth/entities/permission.entity';
import { PlanModule } from '@auth/entities/plan-module.entity';
import { UserPreference } from '@auth/entities/user-preference.entity';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { User } from '@auth/entities/user.entity';
import { UserPreferencesService } from '@auth/user-preferences.service';
import { UserPreferencesController } from '@auth/user-preferences.controller';
import { AvatarStorageService } from '@auth/avatar-storage.service';
import { LogoStorageService } from '@auth/logo-storage.service';
import { CoverStorageService } from '@auth/cover-storage.service';
import { BusinessService } from '@auth/business.service';
import { BusinessController } from '@auth/business.controller';
import { StorageClientModule } from '@/storage-client/storage-client.module';
import { UserService } from '@auth/user.service';
import { RoleService } from '@auth/role.service';
import { PermissionService } from '@auth/permission.service';
import { MenuService } from '@auth/menu.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Plan,
      PlanDescription,
      User,
      Role,
      Menu,
      Permission,
      PlanModule,
      UserPreference,
    ]),
    PassportModule,
    StorageClientModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [
    AuthService,
    UserService,
    RoleService,
    PermissionService,
    MenuService,
    JwtStrategy,
    UserPreferencesService,
    AvatarStorageService,
    LogoStorageService,
    CoverStorageService,
    BusinessService,
  ],
  controllers: [
    AuthController,
    SettingsPermissionsController,
    UserPreferencesController,
    BusinessController,
  ],
  exports: [AuthService],
})
export class AuthModule {}
