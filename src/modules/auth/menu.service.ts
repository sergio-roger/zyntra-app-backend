import { Menu } from '@auth/entities/menu.entity';
import { MenuNode } from '@auth/interfaces/menu-node.interface';
import { PermissionService } from '@auth/permission.service';
import { RoleService } from '@auth/role.service';
import { UserRole } from '@crm/enums/user-role.enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    private roleService: RoleService,
    private permissionService: PermissionService,
  ) {}

  async getAllMenus(): Promise<Menu[]> {
    return this.menuRepository.find({
      order: { parent_key: 'ASC', key: 'ASC' },
    });
  }

  async getMenuTree(
    role: UserRole,
    businessId: string,
    planId?: string,
  ): Promise<MenuNode[]> {
    try {
      const roleRow = await this.roleService.findByName(role);
      if (!roleRow) {
        this.logger.warn(
          `getMenuTree: role "${role}" not found in security.roles — run "npm run seed:rbac" to seed roles and menus`,
        );
        return [];
      }

      const roleId = roleRow.id;

      await this.permissionService.ensureBusinessPermissions(
        businessId,
        roleId,
      );

      const conn = this.menuRepository.manager.connection;

      // Mapear el resultado de la consulta raw directamente a la estructura MenuNode[] para consistencia de tipos
      const rows = (await conn.query(
        `SELECT m.id, m.key, m.label, m.path, m.parent_key
         FROM security.permissions p
         JOIN security.menus m ON m.id = p.menu_id
         WHERE p.role_id = $1 AND p.business_id = $2
         ORDER BY m.parent_key NULLS FIRST, m.key`,
        [roleId, businessId],
      )) as MenuNode[];

      // Build plan-module access map (key → access_level)
      const moduleMap = new Map<string, string>();
      if (planId) {
        // Castear a clave-valor del módulo para resolver tipos al poblar el mapa de accesos
        const planModules = (await conn.query(
          `SELECT menu_key, access_level FROM public.plan_modules WHERE plan_id = $1`,
          [planId],
        )) as { menu_key: string; access_level: string }[];
        for (const pm of planModules) {
          moduleMap.set(pm.menu_key, pm.access_level);
        }
      }

      const resolveAccess = (key: string, parentKey: string | null): string => {
        if (moduleMap.has(key)) return moduleMap.get(key)!;
        if (parentKey && moduleMap.has(parentKey))
          return moduleMap.get(parentKey)!;
        return 'full';
      };

      const buildTree = (parentKey: string | null): MenuNode[] =>
        rows
          .filter((m) => m.parent_key === parentKey)
          .map((m) => ({
            id: m.id,
            key: m.key,
            label: m.label,
            path: m.path,
            parent_key: m.parent_key,
            access_level: resolveAccess(m.key, m.parent_key),
            children: buildTree(m.key),
          }));

      return buildTree(null);
    } catch {
      return [];
    }
  }
}
