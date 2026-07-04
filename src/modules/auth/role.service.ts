import { Business } from '@auth/entities/business.entity';
import { Permission } from '@auth/entities/permission.entity';
import { Role } from '@auth/entities/role.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface RoleData {
  name: string;
  label: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  iconColor?: string;
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async getAllRoles(business?: Business, role?: UserRole): Promise<Role[]> {
    const query = this.roleRepository.createQueryBuilder('role');
    if (business) {
      query.where('role.businessId = :businessId OR role.businessId IS NULL', {
        businessId: business.id,
      });
    } else {
      query.where('role.businessId IS NULL');
    }

    let roles = await query.orderBy('role.name', 'ASC').getMany();

    if (role !== UserRole.SUPER_ADMIN) {
      roles = roles.filter((r) => r.name !== 'superAdmin');
    }
    return roles;
  }

  async createRole(data: RoleData, businessId?: string): Promise<Role> {
    const lowerName = data.name.toLowerCase();

    // Check if a role with this name already exists either globally or for this business
    const query = this.roleRepository
      .createQueryBuilder('role')
      .where('role.name = :name', { name: lowerName });

    if (businessId) {
      query.andWhere(
        '(role.businessId = :businessId OR role.businessId IS NULL)',
        { businessId },
      );
    } else {
      query.andWhere('role.businessId IS NULL');
    }

    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException(`Role with name ${data.name} already exists`);
    }

    const role = this.roleRepository.create({
      name: lowerName,
      label: data.label,
      description: data.description,
      badge: data.badge,
      badgeColor: data.badgeColor,
      iconColor: data.iconColor,
      isEditable: true,
      businessId: businessId || null,
    });
    return this.roleRepository.save(role);
  }

  async updateRole(
    name: string,
    data: Omit<RoleData, 'name'>,
    businessId: string,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name: name.toLowerCase(), businessId },
    });

    if (!role) {
      throw new BadRequestException('Role not found or not editable');
    }

    Object.assign(role, data);
    return this.roleRepository.save(role);
  }

  async deleteRole(name: string, businessId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { name: name.toLowerCase(), businessId },
    });

    if (!role) {
      throw new BadRequestException('Role not found or not deletable');
    }

    // Also delete any permissions assigned to this role in this business
    await this.permissionRepository.delete({
      business_id: businessId,
      role_id: role.id,
    });

    await this.roleRepository.remove(role);
  }

  async roleExists(name: string, businessId?: string): Promise<boolean> {
    const query = this.roleRepository
      .createQueryBuilder('role')
      .where('role.name = :name', { name: name.toLowerCase() });

    if (businessId) {
      query.andWhere(
        '(role.businessId = :businessId OR role.businessId IS NULL)',
        { businessId },
      );
    } else {
      query.andWhere('role.businessId IS NULL');
    }

    const count = await query.getCount();
    return count > 0;
  }
}
