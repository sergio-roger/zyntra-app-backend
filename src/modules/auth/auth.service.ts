import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Business, PlanStatus } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CrmUser } from '@crm/entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { Permission } from './entities/permission.entity';

// TODO: Replace with persisted PasswordResetToken entity + email delivery (SMTP/Resend).
// In-memory store is fine for dev / single-instance only.
type ResetEntry = { businessId: string; expiresAt: number };
const resetTokens = new Map<string, ResetEntry>();
const RESET_TTL_MS = 30 * 60 * 1000; // 30 min

export interface MenuNode {
  id: string;
  key: string;
  label: string;
  path: string;
  parent_key: string | null;
  access_level?: string;
  children: MenuNode[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(CrmUser)
    private crmUserRepository: Repository<CrmUser>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private jwtService: JwtService,
  ) {}

  private getArgonOptions() {
    return {
      secret: Buffer.from(
        process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
      ),
    };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const normalizedEmail = email.toLowerCase();

    const existingBusiness = await this.businessRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingBusiness) {
      throw new ConflictException('Email already registered');
    }

    const defaultPlan = await this.planRepository.findOne({
      where: { name: 'Impulse Pro' },
    });
    if (!defaultPlan) {
      throw new BadRequestException(
        'System not configured: run seed-plans before registering businesses',
      );
    }

    const password_hash = await argon2.hash(password, this.getArgonOptions());
    const trial_ends_at = new Date();
    trial_ends_at.setDate(trial_ends_at.getDate() + 14);

    const business = this.businessRepository.create({
      name,
      email: normalizedEmail,
      password_hash,
      plan_id: defaultPlan.id,
      plan_status: PlanStatus.TRIAL,
      trial_ends_at,
    });

    const savedBusiness = await this.businessRepository.save(business);
    const reloaded = await this.validateBusiness(savedBusiness.id);
    return this.generateBusinessToken(reloaded!);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    // 1. Try Business login first
    const business = await this.businessRepository.findOne({
      where: { email: normalizedEmail },
      relations: ['plan_object'],
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: true,
        plan_status: true,
        plan_id: true,
      },
    });

    if (business) {
      if (business.plan_id === null) {
        throw new UnauthorizedException(
          'Los administradores globales y usuarios asociados no pueden iniciar sesión por el login tradicional.',
        );
      }
      if (
        await argon2.verify(
          business.password_hash,
          password,
          this.getArgonOptions(),
        )
      ) {
        const reloaded = await this.validateBusiness(business.id);
        return this.generateBusinessToken(reloaded!);
      }
    }

    // 2. Try CrmUser login
    const crmUser = await this.crmUserRepository.findOne({
      where: { email: normalizedEmail, is_active: true },
      select: {
        id: true,
        email: true,
        role: true,
        password_hash: true,
        business_id: true,
      },
    });

    if (crmUser) {
      const businessEntity = await this.validateBusiness(crmUser.business_id);
      if (businessEntity && businessEntity.plan_id === null) {
        throw new UnauthorizedException(
          'Los administradores globales y usuarios asociados no pueden iniciar sesión por el login tradicional.',
        );
      }
      if (
        crmUser.password_hash &&
        (await argon2.verify(
          crmUser.password_hash,
          password,
          this.getArgonOptions(),
        ))
      ) {
        if (!businessEntity) {
          throw new UnauthorizedException('Credenciales incorrectas');
        }
        return this.generateCrmUserToken(businessEntity, crmUser);
      }
    }

    throw new UnauthorizedException('Credenciales incorrectas');
  }

  refresh(user: Business & { crm_user_id?: string | null; role?: UserRole }) {
    if (user.crm_user_id) {
      const crmUserPartial = {
        id: user.crm_user_id,
        role: user.role ?? UserRole.ADMIN,
      } as CrmUser;
      return this.generateCrmUserToken(user, crmUserPartial);
    }
    return this.generateBusinessToken(user);
  }

  private generateBusinessToken(business: Business) {
    const payload: JwtPayload = {
      sub: business.id,
      email: business.email,
      plan: business.plan_object?.name || 'none',
      plan_status: business.plan_status,
      business_id: business.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: business.id,
        name: business.name,
        email: business.email,
        plan: business.plan_object,
        plan_status: business.plan_status,
        role: UserRole.ADMIN,
        crm_user_id: null,
      },
    };
  }

  private generateCrmUserToken(
    business: Business,
    crmUser: Pick<CrmUser, 'id' | 'role' | 'business_id'>,
  ) {
    const payload: JwtPayload = {
      sub: business.id,
      email: business.email,
      plan: business.plan_object?.name || 'none',
      plan_status: business.plan_status,
      business_id: business.id,
      crm_user_id: crmUser.id,
      role: crmUser.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: business.id,
        name: business.name,
        email: business.email,
        plan: business.plan_object,
        plan_status: business.plan_status,
        role: crmUser.role,
        crm_user_id: crmUser.id,
      },
    };
  }

  async validateBusiness(id: string): Promise<Business | null> {
    return this.businessRepository.findOne({
      where: { id },
      relations: ['plan_object'],
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!business) return;

    const token = randomBytes(32).toString('hex');
    resetTokens.set(token, {
      businessId: business.id,
      expiresAt: Date.now() + RESET_TTL_MS,
    });

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    this.logger.warn(
      `[DEV] Password reset link for ${business.email}: ${link}`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const business = await this.businessRepository.findOne({
      where: { id: entry.businessId },
    });
    if (!business) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    business.password_hash = await argon2.hash(
      newPassword,
      this.getArgonOptions(),
    );
    await this.businessRepository.save(business);
    resetTokens.delete(token);
  }

  async getMenuTree(
    role: UserRole,
    businessId: string,
    planId?: string,
  ): Promise<MenuNode[]> {
    try {
      const conn = this.businessRepository.manager.connection;

      const roleRow = (await conn.query(
        `SELECT id FROM security.roles WHERE name = $1 LIMIT 1`,
        [role],
      )) as { id: string }[];
      if (!roleRow || roleRow.length === 0) {
        this.logger.warn(
          `getMenuTree: role "${role}" not found in security.roles — run "npm run seed:rbac" to seed roles and menus`,
        );
        return [];
      }

      const roleId = roleRow[0].id;

      await this.ensureBusinessPermissions(businessId, roleId);

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

      const roots = rows.filter((m) => m.parent_key === null);
      return roots.map((root) => ({
        id: root.id,
        key: root.key,
        label: root.label,
        path: root.path,
        parent_key: root.parent_key,
        access_level: resolveAccess(root.key, root.parent_key),
        children: rows
          .filter((m) => m.parent_key === root.key)
          .map((child) => ({
            id: child.id,
            key: child.key,
            label: child.label,
            path: child.path,
            parent_key: child.parent_key,
            access_level: resolveAccess(child.key, child.parent_key),
            children: [],
          })),
      }));
    } catch {
      return [];
    }
  }

  private async ensureBusinessPermissions(
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

  async getAllRoles(business?: Business): Promise<Role[]> {
    const query = this.roleRepository.createQueryBuilder('role');
    if (business) {
      query.where('role.businessId = :businessId OR role.businessId IS NULL', {
        businessId: business.id,
      });
    } else {
      query.where('role.businessId IS NULL');
    }

    let roles = await query.orderBy('role.name', 'ASC').getMany();

    if (business && business.email !== 'superadmin@zyntra.com') {
      roles = roles.filter((role) => role.name !== 'superAdmin');
    }
    return roles;
  }

  async createRole(
    data: {
      name: string;
      label: string;
      description?: string;
      badge?: string;
      badgeColor?: string;
      iconColor?: string;
    },
    businessId?: string,
  ): Promise<Role> {
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
    data: {
      label: string;
      description?: string;
      badge?: string;
      badgeColor?: string;
      iconColor?: string;
    },
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

  async getAllMenus(): Promise<Menu[]> {
    return this.menuRepository.find({
      order: { parent_key: 'ASC', key: 'ASC' },
    });
  }

  async getPermissionsByRole(
    roleName: string,
    businessId: string,
  ): Promise<string[]> {
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });
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
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });
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
