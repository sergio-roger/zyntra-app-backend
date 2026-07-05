import { UploadableFile } from '@auth/avatar-storage.service';
import { RESET_TTL_MS } from '@auth/constants/auth.constants';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import { LoginDto } from '@auth/dto/login.dto';
import { RegisterDto } from '@auth/dto/register.dto';
import { UpdateProfileDto } from '@auth/dto/update-profile.dto';
import { Business, PlanStatus } from '@auth/entities/business.entity';
import { Menu } from '@auth/entities/menu.entity';
import { Plan } from '@auth/entities/plan.entity';
import { Role } from '@auth/entities/role.entity';
import { User } from '@auth/entities/user.entity';
import { JwtPayload } from '@auth/interfaces/jwt-payload.interface';
import { MenuNode } from '@auth/interfaces/menu-node.interface';
import { MenuService } from '@auth/menu.service';
import { PermissionService } from '@auth/permission.service';
import { RoleData, RoleService } from '@auth/role.service';
import { UserService } from '@auth/user.service';
import { hashPassword, verifyPassword } from '@auth/utils/password.util';
import { resetTokens } from '@auth/utils/reset-tokens.util';
import { UserRole } from '@crm/enums/user-role.enum';
import { UserStatus } from '@crm/enums/user-status.enum';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { StorageClientService } from '@/storage-client/storage-client.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    private jwtService: JwtService,
    private userService: UserService,
    private roleService: RoleService,
    private permissionService: PermissionService,
    private menuService: MenuService,
    private storageClient: StorageClientService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await this.userService.findByEmail(normalizedEmail);
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

    const passwordHash = await hashPassword(password);
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

    const reloaded = await this.userService.findByIdWithBusiness(savedUser.id);
    return this.generateUserToken(reloaded!);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    this.logger.log(`[login] attempt email=${normalizedEmail}`);

    const user =
      await this.userService.findActiveByEmailWithBusiness(normalizedEmail);

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
      (await verifyPassword(user.passwordHash, password));

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

  private async generateUserToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      plan: user.business.plan_object?.name || 'none',
      plan_status: user.business.plan_status,
      business_id: user.business.id,
      role: user.role,
    };

    let avatarUrl: string | null = null;
    if (user.avatarFileId) {
      try {
        avatarUrl = await this.storageClient.getSignedUrl(
          user.businessId,
          user.avatarFileId,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to get signed URL for user ${user.id} avatar file ${user.avatarFileId}: ${(err as Error).message}`,
        );
      }
    }

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
        avatarUrl: avatarUrl || user.avatarUrl || null,
      },
    };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userService.findByIdWithBusiness(id);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
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

    await this.userService.updatePasswordHash(entry.userId, newPassword);
    resetTokens.delete(token);
  }

  getSelfProfile(userId: string) {
    return this.userService.getSelfProfile(userId);
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, dto);
  }

  changePassword(userId: string, dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto);
  }

  uploadAvatar(userId: string, file: UploadableFile | undefined) {
    return this.userService.uploadAvatar(userId, file);
  }

  removeAvatar(userId: string) {
    return this.userService.removeAvatar(userId);
  }

  getMenuTree(
    role: UserRole,
    businessId: string,
    planId?: string,
  ): Promise<MenuNode[]> {
    return this.menuService.getMenuTree(role, businessId, planId);
  }

  getAllMenus(): Promise<Menu[]> {
    return this.menuService.getAllMenus();
  }

  getAllRoles(business?: Business, role?: UserRole): Promise<Role[]> {
    return this.roleService.getAllRoles(business, role);
  }

  createRole(data: RoleData, businessId?: string): Promise<Role> {
    return this.roleService.createRole(data, businessId);
  }

  updateRole(
    name: string,
    data: Omit<RoleData, 'name'>,
    businessId: string,
  ): Promise<Role> {
    return this.roleService.updateRole(name, data, businessId);
  }

  deleteRole(name: string, businessId: string): Promise<void> {
    return this.roleService.deleteRole(name, businessId);
  }

  roleExists(name: string, businessId?: string): Promise<boolean> {
    return this.roleService.roleExists(name, businessId);
  }

  getPermissionsByRole(
    roleName: string,
    businessId: string,
  ): Promise<string[]> {
    return this.permissionService.getPermissionsByRole(roleName, businessId);
  }

  updatePermissionsByRole(
    roleName: string,
    menuIds: string[],
    businessId: string,
  ): Promise<void> {
    return this.permissionService.updatePermissionsByRole(
      roleName,
      menuIds,
      businessId,
    );
  }
}
