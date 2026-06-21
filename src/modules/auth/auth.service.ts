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
import * as bcrypt from 'bcrypt';
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

    const password_hash = await bcrypt.hash(password, 10);
    const trial_ends_at = new Date();
    trial_ends_at.setDate(trial_ends_at.getDate() + 14);

    const business = this.businessRepository.create({
      name,
      email: normalizedEmail,
      password_hash,
      plan_id: defaultPlan?.id,
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

    if (business && (await bcrypt.compare(password, business.password_hash))) {
      const reloaded = await this.validateBusiness(business.id);
      return this.generateBusinessToken(reloaded!);
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

    if (
      crmUser &&
      crmUser.password_hash &&
      (await bcrypt.compare(password, crmUser.password_hash))
    ) {
      const businessEntity = await this.validateBusiness(crmUser.business_id);
      if (!businessEntity) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }
      return this.generateCrmUserToken(businessEntity, crmUser);
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
      plan: (business as any).plan_object?.name || 'none',
      plan_status: business.plan_status,
      business_id: business.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: business.id,
        name: business.name,
        email: business.email,
        plan: (business as any).plan_object,
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
      plan: (business as any).plan_object?.name || 'none',
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
        plan: (business as any).plan_object,
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

    business.password_hash = await bcrypt.hash(newPassword, 10);
    await this.businessRepository.save(business);
    resetTokens.delete(token);
  }

  async getMenuTree(role: UserRole): Promise<MenuNode[]> {
    try {
      const conn = this.businessRepository.manager.connection as any;
      if (!conn) return [];

      const roleRow = await conn.query(
        `SELECT id FROM security.roles WHERE name = $1 LIMIT 1`,
        [role],
      );
      if (!roleRow || roleRow.length === 0) return [];

      const roleId = roleRow[0].id;

      const rows = await conn.query(
        `SELECT m.id, m.key, m.label, m.path, m.parent_key
         FROM security.permissions p
         JOIN security.menus m ON m.id = p.menu_id
         WHERE p.role_id = $1
         ORDER BY m.parent_key NULLS FIRST, m.key`,
        [roleId],
      );

      const roots = rows.filter((m: any) => m.parent_key === null);
      return roots.map((root: any) => ({
        ...root,
        children: rows.filter((m: any) => m.parent_key === root.key),
      }));
    } catch {
      return [];
    }
  }

  async getAllMenus(): Promise<Menu[]> {
    return this.menuRepository.find({
      order: { parent_key: 'ASC', key: 'ASC' },
    });
  }

  async getPermissionsByRole(roleName: string): Promise<string[]> {
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new BadRequestException(`Role with name ${roleName} not found`);
    }

    const permissions = await this.permissionRepository.find({
      where: { role_id: role.id },
    });

    return permissions.map((p) => p.menu_id);
  }

  async updatePermissionsByRole(roleName: string, menuIds: string[]): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new BadRequestException(`Role with name ${roleName} not found`);
    }

    // Wrap in transaction or delete & insert
    await this.permissionRepository.manager.transaction(async (manager) => {
      // 1. Delete all current permissions for the role
      await manager.delete(Permission, { role_id: role.id });

      // 2. Insert new permissions if any menuIds are provided
      if (menuIds && menuIds.length > 0) {
        const entities = menuIds.map((menuId) =>
          manager.create(Permission, { role_id: role.id, menu_id: menuId }),
        );
        await manager.save(entities);
      }
    });
  }
}
