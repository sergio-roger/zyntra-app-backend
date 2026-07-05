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
    const existing = await this.permissionRepository.count({
      where: { business_id: businessId, role_id: roleId },
    });
    if (existing > 0) return;

    // Copy from global templates (business_id IS NULL)
    const templates = await this.permissionRepository
      .createQueryBuilder('p')
      .where('p.role_id = :roleId', { roleId })
      .andWhere('p.business_id IS NULL')
      .getMany();
    if (templates.length === 0) {
      this.logger.warn(
        `ensureBusinessPermissions: no global permission templates found for role "${roleId}" — run "npm run seed:rbac"`,
      );
      return;
    }

    const copies = templates.map((t) =>
      this.permissionRepository.create({
        business_id: businessId,
        role_id: t.role_id,
        menu_id: t.menu_id,
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
      where: { business_id: businessId, role_id: role.id },
    });

    return permissions.map((p) => p.menu_id);
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
        business_id: businessId,
        role_id: role.id,
      });

      if (menuIds && menuIds.length > 0) {
        const entities = menuIds.map((menuId) =>
          manager.create(Permission, {
            business_id: businessId,
            role_id: role.id,
            menu_id: menuId,
          }),
        );
        await manager.save(entities);
      }
    });
  }
}
