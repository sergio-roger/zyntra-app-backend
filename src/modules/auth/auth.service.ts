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
import { Business, PlanStatus } from '@auth/entities/business.entity';
import { Plan } from '@auth/entities/plan.entity';
import { User } from '@auth/entities/user.entity';
import { RegisterDto } from '@auth/dto/register.dto';
import { LoginDto } from '@auth/dto/login.dto';
import { UserRole } from '@crm/enums/user-role.enum';
import { UserStatus } from '@crm/enums/user-status.enum';
import { JwtPayload } from '@auth/interfaces/jwt-payload.interface';
import { Role } from '@auth/entities/role.entity';
import { Menu } from '@auth/entities/menu.entity';
import { Permission } from '@auth/entities/permission.entity';
import { UpdateProfileDto } from '@auth/dto/update-profile.dto';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import {
  AvatarStorageService,
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  UploadableFile,
} from '@auth/avatar-storage.service';

// TODO: Replace with persisted PasswordResetToken entity + email delivery (SMTP/Resend).
// In-memory store is fine for dev / single-instance only.
type ResetEntry = { userId: string; expiresAt: number };
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

export interface SelfProfile {
  id: string;
  businessId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: UserRole;
  plan: Plan | null;
  plan_status: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  isAccountActivated: boolean;
  status: string;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private jwtService: JwtService,
    private avatarStorage: AvatarStorageService,
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

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
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

    const passwordHash = await argon2.hash(password, this.getArgonOptions());
    const trial_ends_at = new Date();
    trial_ends_at.setDate(trial_ends_at.getDate() + 14);

    // 1) Business con datos por defecto, 2) primer usuario admin asociado — en una sola transacción.
    const savedUser = await this.businessRepository.manager.transaction(
      async (manager) => {
        const business = await manager.save(
          manager.create(Business, {
            name,
            plan_id: defaultPlan.id,
            plan_status: PlanStatus.TRIAL,
            trial_ends_at,
          }),
        );

        return manager.save(
          manager.create(User, {
            businessId: business.id,
            email: normalizedEmail,
            passwordHash,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            isAccountActivated: true,
            activatedAt: new Date(),
          }),
        );
      },
    );

    const reloaded = await this.validateUser(savedUser.id);
    return this.generateUserToken(reloaded!);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    this.logger.log(`[login] attempt email=${normalizedEmail}`);

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail, isActive: true },
      relations: ['business', 'business.plan_object'],
    });

    if (!user) {
      this.logger.warn(
        `[login] no active user found for email=${normalizedEmail}`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.business.plan_id === null) {
      this.logger.warn(
        `[login] blocked global admin attempt email=${normalizedEmail} id=${user.id}`,
      );
      throw new UnauthorizedException(
        'Los administradores globales no pueden iniciar sesión por el login tradicional.',
      );
    }

    const passwordValid =
      !!user.passwordHash &&
      (await argon2.verify(
        user.passwordHash,
        password,
        this.getArgonOptions(),
      ));

    if (!passwordValid) {
      this.logger.warn(
        `[login] password mismatch email=${normalizedEmail} id=${user.id}`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    this.logger.log(
      `[login] password valid — issuing token id=${user.id} role=${user.role}`,
    );
    return this.generateUserToken(user);
  }

  async refresh(userId: string) {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.generateUserToken(user);
  }

  private generateUserToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      plan: user.business.plan_object?.name || 'none',
      plan_status: user.business.plan_status,
      business_id: user.business.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        businessId: user.business.id,
        name: user.name,
        email: user.email,
        plan: user.business.plan_object,
        plan_status: user.business.plan_status,
        role: user.role,
      },
    };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['business', 'business.plan_object'],
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) return;

    const token = randomBytes(32).toString('hex');
    resetTokens.set(token, {
      userId: user.id,
      expiresAt: Date.now() + RESET_TTL_MS,
    });

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    this.logger.warn(`[DEV] Password reset link for ${user.email}: ${link}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({
      where: { id: entry.userId },
    });
    if (!user) {
      resetTokens.delete(token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await argon2.hash(newPassword, this.getArgonOptions());
    await this.userRepository.save(user);
    resetTokens.delete(token);
  }

  private toSelfProfile(user: User): SelfProfile {
    return {
      id: user.id,
      businessId: user.businessId,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email,
      role: user.role,
      plan: user.business?.plan_object ?? null,
      plan_status: user.business?.plan_status,
      avatarUrl: user.avatarUrl ?? null,
      jobTitle: user.jobTitle ?? null,
      isAccountActivated: user.isAccountActivated,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async getSelfProfile(userId: string): Promise<SelfProfile> {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toSelfProfile(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SelfProfile> {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle;
    await this.userRepository.save(user);
    return this.toSelfProfile(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isValid =
      !!user.passwordHash &&
      (await argon2.verify(
        user.passwordHash,
        dto.currentPassword,
        this.getArgonOptions(),
      ));
    if (!isValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    user.passwordHash = await argon2.hash(
      dto.newPassword,
      this.getArgonOptions(),
    );
    await this.userRepository.save(user);
  }

  async uploadAvatar(
    userId: string,
    file: UploadableFile | undefined,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de archivo no permitido. Usa PNG, JPEG o WEBP.',
      );
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo permitido (2MB).',
      );
    }

    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const previousUrl = user.avatarUrl;

    const avatarUrl = await this.avatarStorage.save(file);
    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);

    if (previousUrl) {
      await this.avatarStorage.delete(previousUrl);
    }

    return { avatarUrl };
  }

  async removeAvatar(userId: string): Promise<void> {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const currentUrl = user.avatarUrl;

    user.avatarUrl = null as unknown as string;
    await this.userRepository.save(user);

    if (currentUrl) {
      await this.avatarStorage.delete(currentUrl);
    }
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
