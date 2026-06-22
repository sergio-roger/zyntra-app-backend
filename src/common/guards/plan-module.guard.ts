import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import {
  PlanModule,
  ModuleAccessLevel,
} from '../../modules/auth/entities/plan-module.entity';
import { Menu } from '../../modules/auth/entities/menu.entity';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';

@Injectable()
export class PlanModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const menuKey = this.reflector.getAllAndOverride<string>(
      REQUIRES_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!menuKey) return true; // No requirement = free access by plan

    const { user: business, method } = context.switchToHttp().getRequest<{
      user?: { plan_id?: string };
      method?: string;
    }>();
    if (!business?.plan_id) return false;

    const planModuleRepo = this.dataSource.getRepository(PlanModule);

    // 1. Try finding explicit key level
    let row = await planModuleRepo.findOne({
      where: { plan_id: business.plan_id, menu_key: menuKey },
    });

    // 2. If not found, try to inherit from parent menu
    if (!row) {
      const menu = await this.dataSource
        .getRepository(Menu)
        .findOne({ where: { key: menuKey } });
      if (menu?.parent_key) {
        row = await planModuleRepo.findOne({
          where: { plan_id: business.plan_id, menu_key: menu.parent_key },
        });
      }
    }

    const level = row?.access_level ?? ModuleAccessLevel.LOCKED;

    if (level === ModuleAccessLevel.LOCKED) {
      throw new ForbiddenException({
        code: 'MODULE_LOCKED',
        module: menuKey,
        message: 'Tu plan actual no incluye acceso a este módulo.',
        upgrade_to: 'Impulse Pro', // Upgradable suggestion
      });
    }

    if (level === ModuleAccessLevel.READ_ONLY) {
      const currentMethod = (method ?? 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(currentMethod)) {
        throw new ForbiddenException({
          code: 'MODULE_READ_ONLY',
          module: menuKey,
          message:
            'Tu plan actual solo permite operaciones de lectura en este módulo.',
        });
      }
    }

    return true;
  }
}
