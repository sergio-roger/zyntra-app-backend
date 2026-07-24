import { Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { PlanModuleGuard } from '@common/guards/plan-module.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { LoggingContextInterceptor } from '@common/interceptors/logging-context.interceptor';

export const GLOBAL_PROVIDERS: Provider[] = [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: PlanModuleGuard },
  { provide: APP_INTERCEPTOR, useClass: LoggingContextInterceptor },
];
