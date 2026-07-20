import { Permission } from '@auth/entities/permission.entity';
import { RoleService } from '@auth/role.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private roleService: RoleService,
  ) {}

  async ensureBusinessPermissions(
    businessId: string,
    roleId: string,
  ): Promise<void> {
    // Copy from global templates (business_id IS NULL)
    const templates = await this.permissionRepository
      .createQueryBuilder('p')
      .where('p.roleId = :roleId', { roleId })
      .andWhere('p.businessId IS NULL')
      .getMany();
    if (templates.length === 0) {
      this.logger.warn(
        `ensureBusinessPermissions: no global permission templates found for role "${roleId}" — run "npm run seed:rbac"`,
      );
      return;
    }

    const existing = await this.permissionRepository.find({
      where: { businessId, roleId },
    });
    const existingMenuIds = new Set(existing.map((p) => p.menuId));

    // Reconciliar: agregar únicamente los menús de template que el negocio
    // todavía no tiene, sin tocar los ya existentes (pueden haber sido
    // personalizados vía updatePermissionsByRole).
    const missing = templates.filter((t) => !existingMenuIds.has(t.menuId));
    if (missing.length === 0) return;

    const copies = missing.map((t) =>
      this.permissionRepository.create({
        businessId,
        roleId: t.roleId,
        menuId: t.menuId,
      }),
    );
    await this.permissionRepository.save(copies);
  }

  async getPermissionsByRole(
    roleName: string,
    businessId: string,
  ): Promise<string[]> {
    const role = await this.roleService.findByName(roleName);
    if (!role) {
      throw new BadRequestException(`Role with name ${roleName} not found`);
    }

    await this.ensureBusinessPermissions(businessId, role.id);

    const permissions = await this.permissionRepository.find({
      where: { businessId, roleId: role.id },
    });

    return permissions.map((p) => p.menuId);
  }

  async updatePermissionsByRole(
    roleName: string,
    menuIds: string[],
    businessId: string,
  ): Promise<void> {
    const role = await this.roleService.findByName(roleName);
    if (!role) {
      throw new BadRequestException(`Role with name ${roleName} not found`);
    }

    await this.permissionRepository.manager.transaction(async (manager) => {
      // Delete only this business's permissions for the role
      await manager.delete(Permission, {
        businessId,
        roleId: role.id,
      });

      if (menuIds && menuIds.length > 0) {
        const entities = menuIds.map((menuId) =>
          manager.create(Permission, {
            businessId,
            roleId: role.id,
            menuId,
          }),
        );
        await manager.save(entities);
      }
    });
  }
}
