/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { Business } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { User } from './entities/user.entity';
import { PlanStatus } from './enums/plan-status.enum';
import { UserRole } from '@crm/enums/user-role.enum';
import { UserStatus } from '@crm/enums/user-status.enum';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AvatarStorageService } from './avatar-storage.service';
import { UserService } from './user.service';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { MenuService } from './menu.service';
import { StorageClientService } from '@/storage-client/storage-client.service';
import { DriveService } from '@/modules/drive/drive.service';

// AuthService ahora delega login/register/perfil a UserService y la gestión de
// roles a RoleService — se instancian reales aquí (con sus repos mockeados)
// para conservar la cobertura de comportamiento en lugar de mockearlos como cajas negras.

let HASHED = '';

const mockBusiness: Partial<Business> = {
  id: 'biz-uuid',
  name: 'Test Biz',
  planId: 'plan-id',
  planStatus: PlanStatus.ACTIVE,
  trialEndsAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
};

const mockUser: Partial<User> = {
  id: 'user-uuid',
  email: 'agent@test.com',
  role: UserRole.AGENT,
  passwordHash: '',
  businessId: 'biz-uuid',
  business: mockBusiness as Business,
  isActive: true,
  firstName: 'Ana',
  lastName: 'Gomez',
  name: 'Ana Gomez',
  jobTitle: 'Agente de Ventas',
  avatarUrl: null as unknown as string,
  isAccountActivated: true,
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-02-01'),
};

describe('AuthService — unified login', () => {
  beforeAll(async () => {
    HASHED = await argon2.hash('Password123!', {
      secret: Buffer.from(
        process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
      ),
    });
    mockUser.passwordHash = HASHED;
  });
  let service: AuthService;

  const txManager = {
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn(),
  };

  const businessRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn() },
  };

  const planRepo = { findOne: jest.fn() };

  const userRepo = { findOne: jest.fn(), save: jest.fn() };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };

  const roleRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };
  const permissionRepo = { find: jest.fn(), delete: jest.fn() };

  const jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

  const avatarStorage = {
    save: jest
      .fn()
      .mockResolvedValue('http://localhost:3000/uploads/avatars/new.png'),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const storageClient = {
    uploadFile: jest.fn().mockResolvedValue({ id: 'file-id-1' }),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('http://localhost:3000/signed/avatar.png'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  const driveService = {
    getOrCreateProfileFolderId: jest.fn().mockResolvedValue('folder-id-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        RoleService,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(Plan), useValue: planRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: AvatarStorageService, useValue: avatarStorage },
        { provide: StorageClientService, useValue: storageClient },
        { provide: DriveService, useValue: driveService },
        { provide: PermissionService, useValue: {} },
        { provide: MenuService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login()', () => {
    it('returns access_token and role when credentials match', async () => {
      userRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.login({
        email: 'agent@test.com',
        password: 'Password123!',
      });

      expect(result.access_token).toBe('mock-token');
      expect(result.user.role).toBe(UserRole.AGENT);
      expect(result.user.businessId).toBe(mockBusiness.id);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      userRepo.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: 'agent@test.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no active user is found', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the business has plan_id null (global admin)', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        ...mockUser,
        business: { ...mockBusiness, planId: null },
      });

      await expect(
        service.login({ email: 'agent@test.com', password: 'Password123!' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Los administradores globales no pueden iniciar sesión por el login tradicional.',
        ),
      );
    });
  });

  describe('register()', () => {
    const mockPlan = { id: 'plan-impulse-id', name: 'Impulse Pro' };

    const runTransaction = (savedUserId = 'new-user-uuid') => {
      businessRepo.manager.transaction.mockImplementationOnce(
        async (cb: (manager: typeof txManager) => Promise<unknown>) => {
          txManager.save
            .mockImplementationOnce(async (data: Record<string, unknown>) => ({
              ...data,
              id: 'new-biz-uuid',
            }))
            .mockImplementationOnce(async (data: Record<string, unknown>) => ({
              ...data,
              id: savedUserId,
            }));
          return cb(txManager);
        },
      );
    };

    it('throws BadRequestException when Impulse Pro plan is not seeded', async () => {
      userRepo.findOne.mockResolvedValueOnce(null); // no conflict
      planRepo.findOne.mockResolvedValueOnce(null); // plan not found

      await expect(
        service.register({
          name: 'Nueva',
          email: 'nueva@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when email is already registered', async () => {
      userRepo.findOne.mockResolvedValueOnce(mockUser); // email exists

      await expect(
        service.register({
          name: 'Dup',
          email: 'agent@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the business and its first admin user in a single transaction', async () => {
      userRepo.findOne.mockResolvedValueOnce(null); // no conflict
      planRepo.findOne.mockResolvedValueOnce(mockPlan);
      runTransaction('new-user-uuid');
      userRepo.findOne.mockResolvedValueOnce({
        ...mockUser,
        id: 'new-user-uuid',
        role: UserRole.ADMIN,
        business: { ...mockBusiness, id: 'new-biz-uuid' },
      });

      const result = await service.register({
        name: 'Nueva Empresa',
        email: 'nueva@test.com',
        password: 'Pass123!',
      });

      expect(txManager.create).toHaveBeenCalledWith(
        Business,
        expect.objectContaining({
          name: 'Nueva Empresa',
          planId: mockPlan.id,
        }),
      );
      expect(txManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          businessId: 'new-biz-uuid',
          email: 'nueva@test.com',
          role: UserRole.ADMIN,
        }),
      );
      expect(result.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Role Management', () => {
    describe('getAllRoles()', () => {
      it('returns roles ordered by name, filtering superAdmin unless caller is superAdmin', async () => {
        const mockRoles = [
          { id: '1', name: 'admin', label: 'Administrador' },
          { id: '2', name: 'agent', label: 'Agente' },
        ];
        mockQueryBuilder.getMany.mockResolvedValueOnce(mockRoles);

        const result = await service.getAllRoles(
          { id: 'biz-id' } as Business,
          UserRole.ADMIN,
        );
        expect(result).toEqual(mockRoles);
        expect(roleRepo.createQueryBuilder).toHaveBeenCalledWith('role');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'role.businessId = :businessId OR role.businessId IS NULL',
          { businessId: 'biz-id' },
        );
      });
    });

    describe('createRole()', () => {
      it('creates and saves a role successfully', async () => {
        mockQueryBuilder.getOne.mockResolvedValueOnce(null); // No conflict
        const newRole = {
          id: 'new-role-id',
          name: 'custom',
          label: 'Custom Role',
        };
        roleRepo.create.mockReturnValueOnce(newRole);
        roleRepo.save.mockResolvedValueOnce(newRole);

        const result = await service.createRole(
          { name: 'custom', label: 'Custom Role', description: 'Desc' },
          'biz-id',
        );
        expect(result).toEqual(newRole);
        expect(roleRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'custom',
            businessId: 'biz-id',
          }),
        );
      });

      it('throws ConflictException if role already exists', async () => {
        mockQueryBuilder.getOne.mockResolvedValueOnce({ id: 'existing' });

        await expect(
          service.createRole(
            { name: 'custom', label: 'Custom Role' },
            'biz-id',
          ),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('updateRole()', () => {
      it('updates a custom role successfully', async () => {
        const existingRole = {
          id: 'custom-id',
          name: 'custom',
          label: 'Old Label',
          businessId: 'biz-id',
        };
        roleRepo.findOne.mockResolvedValueOnce(existingRole);
        roleRepo.save.mockResolvedValueOnce({
          ...existingRole,
          label: 'New Label',
        });

        const result = await service.updateRole(
          'custom',
          { label: 'New Label' },
          'biz-id',
        );
        expect(result.label).toBe('New Label');
        expect(roleRepo.findOne).toHaveBeenCalledWith({
          where: { name: 'custom', businessId: 'biz-id' },
        });
      });

      it('throws BadRequestException if role not found', async () => {
        roleRepo.findOne.mockResolvedValueOnce(null);

        await expect(
          service.updateRole('custom', { label: 'New Label' }, 'biz-id'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteRole()', () => {
      it('deletes role and related permissions', async () => {
        const roleToDelete = {
          id: 'custom-id',
          name: 'custom',
          businessId: 'biz-id',
        };
        roleRepo.findOne.mockResolvedValueOnce(roleToDelete);

        await service.deleteRole('custom', 'biz-id');

        expect(permissionRepo.delete).toHaveBeenCalledWith({
          businessId: 'biz-id',
          roleId: 'custom-id',
        });
        expect(roleRepo.remove).toHaveBeenCalledWith(roleToDelete);
      });
    });

    describe('roleExists()', () => {
      it('returns true if role count > 0', async () => {
        mockQueryBuilder.getCount.mockResolvedValueOnce(1);

        const result = await service.roleExists('admin', 'biz-id');
        expect(result).toBe(true);
      });

      it('returns false if role count is 0', async () => {
        mockQueryBuilder.getCount.mockResolvedValueOnce(0);

        const result = await service.roleExists('unknown', 'biz-id');
        expect(result).toBe(false);
      });
    });
  });

  describe('Self-service profile (My Account)', () => {
    describe('updateProfile()', () => {
      it('updates only the fields sent and leaves the rest untouched', async () => {
        const existingUser = { ...mockUser } as User;
        userRepo.findOne.mockResolvedValueOnce(existingUser);
        userRepo.save.mockImplementationOnce((u: User) => Promise.resolve(u));

        await service.updateProfile('user-uuid', { firstName: 'Nuevo' });

        expect(userRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Nuevo',
            lastName: mockUser.lastName,
            jobTitle: mockUser.jobTitle,
            email: mockUser.email,
          }),
        );
      });

      it('never allows changing email, role or businessId even if present on the payload', async () => {
        const existingUser = { ...mockUser } as User;
        userRepo.findOne.mockResolvedValueOnce(existingUser);
        userRepo.save.mockImplementationOnce((u: User) => Promise.resolve(u));

        const maliciousPayload = {
          firstName: 'Nuevo',
          email: 'hacker@evil.com',
          role: UserRole.ADMIN,
          businessId: 'another-biz-id',
        } as any;

        await service.updateProfile('user-uuid', maliciousPayload);

        expect(userRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            email: mockUser.email,
            role: mockUser.role,
            businessId: mockUser.businessId,
          }),
        );
      });
    });

    describe('changePassword()', () => {
      it('throws UnauthorizedException when currentPassword is incorrect', async () => {
        userRepo.findOne.mockResolvedValueOnce({
          ...mockUser,
          passwordHash: HASHED,
        });

        await expect(
          service.changePassword('user-uuid', {
            currentPassword: 'WrongPassword1',
            newPassword: 'NewPassword2',
          }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('throws BadRequestException when newPassword equals currentPassword', async () => {
        await expect(
          service.changePassword('user-uuid', {
            currentPassword: 'Password123!',
            newPassword: 'Password123!',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('hashes the new password before saving', async () => {
        userRepo.findOne.mockResolvedValueOnce({
          ...mockUser,
          passwordHash: HASHED,
        });
        userRepo.save.mockImplementationOnce((u: User) => Promise.resolve(u));

        await service.changePassword('user-uuid', {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword2',
        });

        const saved = userRepo.save.mock.calls[0][0] as User;
        expect(saved.passwordHash).not.toBe('NewPassword2');
        expect(
          await argon2.verify(saved.passwordHash!, 'NewPassword2', {
            secret: Buffer.from(
              process.env.ARGON2_PEPPER ||
                'default-pepper-key-for-fallback-planchat',
            ),
          }),
        ).toBe(true);
      }, 15000);
    });

    describe('uploadAvatar()', () => {
      it('rejects files with a disallowed MIME type', async () => {
        await expect(
          service.uploadAvatar('user-uuid', {
            buffer: Buffer.from('fake'),
            mimetype: 'application/pdf',
            size: 100,
          }),
        ).rejects.toThrow(BadRequestException);

        expect(storageClient.uploadFile).not.toHaveBeenCalled();
      });

      it('rejects files that exceed the maximum size', async () => {
        await expect(
          service.uploadAvatar('user-uuid', {
            buffer: Buffer.from('fake'),
            mimetype: 'image/png',
            size: 3 * 1024 * 1024,
          }),
        ).rejects.toThrow(BadRequestException);

        expect(storageClient.uploadFile).not.toHaveBeenCalled();
      });

      it('saves a valid file and returns the new avatarUrl', async () => {
        userRepo.findOne.mockResolvedValueOnce({ ...mockUser });
        userRepo.save.mockResolvedValueOnce(undefined);

        const result = await service.uploadAvatar('user-uuid', {
          buffer: Buffer.from('fake'),
          mimetype: 'image/png',
          size: 100,
        });

        expect(storageClient.uploadFile).toHaveBeenCalled();
        expect(result.avatarUrl).toBe(
          'http://localhost:3000/signed/avatar.png',
        );
      });
    });
  });
});
