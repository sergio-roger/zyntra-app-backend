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
import { Business, PlanStatus } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { Permission } from './entities/permission.entity';

let HASHED = '';

const mockBusiness: Partial<Business> = {
  id: 'biz-uuid',
  name: 'Test Biz',
  email: 'biz@test.com',
  password_hash: '',
  plan_status: PlanStatus.ACTIVE,
};

const mockCrmUser: Partial<CrmUser> = {
  id: 'user-uuid',
  email: 'agent@test.com',
  role: UserRole.AGENT,
  password_hash: '',
  business_id: 'biz-uuid',
  is_active: true,
};

describe('AuthService — unified login', () => {
  beforeAll(async () => {
    HASHED = await argon2.hash('Password123!', {
      secret: Buffer.from(
        process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
      ),
    });
    mockBusiness.password_hash = HASHED;
    mockCrmUser.password_hash = HASHED;
  });
  let service: AuthService;

  const businessRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const planRepo = { findOne: jest.fn() };

  const crmUserRepo = { findOne: jest.fn() };

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
  const menuRepo = { find: jest.fn() };
  const permissionRepo = { find: jest.fn(), delete: jest.fn() };

  const jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(Plan), useValue: planRepo },
        { provide: getRepositoryToken(CrmUser), useValue: crmUserRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Menu), useValue: menuRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login() as Business', () => {
    it('returns access_token without crm_user_id when Business credentials match', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(mockBusiness) // password check
        .mockResolvedValueOnce(mockBusiness); // validateBusiness reload

      const result = await service.login({
        email: 'biz@test.com',
        password: 'Password123!',
      });

      expect(result.access_token).toBe('mock-token');
      expect(result.user.crm_user_id).toBeNull();
      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('throws UnauthorizedException when Business password is wrong', async () => {
      businessRepo.findOne.mockResolvedValueOnce(mockBusiness);
      crmUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'biz@test.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Business has plan_id null', async () => {
      businessRepo.findOne.mockResolvedValueOnce({
        ...mockBusiness,
        plan_id: null,
      });

      await expect(
        service.login({ email: 'biz@test.com', password: 'Password123!' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Los administradores globales y usuarios asociados no pueden iniciar sesión por el login tradicional.',
        ),
      );
    });
  });

  describe('login() as CrmUser', () => {
    it('returns access_token with crm_user_id and role when CrmUser credentials match', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(null) // no Business with this email
        .mockResolvedValueOnce(mockBusiness); // validateBusiness reload
      crmUserRepo.findOne.mockResolvedValueOnce(mockCrmUser);

      const result = await service.login({
        email: 'agent@test.com',
        password: 'Password123!',
      });

      expect(result.access_token).toBe('mock-token');
      expect(result.user.crm_user_id).toBe(mockCrmUser.id);
      expect(result.user.role).toBe(UserRole.AGENT);
    });

    it('throws UnauthorizedException when CrmUser credentials are wrong', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null);
      crmUserRepo.findOne.mockResolvedValueOnce(mockCrmUser);

      await expect(
        service.login({ email: 'agent@test.com', password: 'BadPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when CrmUser is inactive (is_active = false filtered by repo)', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null);
      // is_active: false → repo returns null because we filter by is_active: true
      crmUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'inactive@test.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when CrmUser belongs to a business with plan_id null', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null);
      crmUserRepo.findOne.mockResolvedValueOnce(mockCrmUser);
      businessRepo.findOne.mockResolvedValueOnce({
        ...mockBusiness,
        plan_id: null,
      });

      await expect(
        service.login({ email: 'agent@test.com', password: 'Password123!' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Los administradores globales y usuarios asociados no pueden iniciar sesión por el login tradicional.',
        ),
      );
    });
  });

  describe('login() — no credentials match', () => {
    it('throws UnauthorizedException when neither Business nor CrmUser found', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null);
      crmUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register()', () => {
    const mockPlan = { id: 'plan-impulse-id', name: 'Impulse Pro' };
    const savedBusiness = {
      id: 'biz-new-uuid',
      name: 'Nueva Empresa',
      email: 'nueva@test.com',
      plan_status: PlanStatus.TRIAL,
    };

    it('throws BadRequestException when Impulse Pro plan is not seeded', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null); // no conflict
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
      businessRepo.findOne.mockResolvedValueOnce(mockBusiness); // email exists

      await expect(
        service.register({
          name: 'Dup',
          email: 'biz@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates business with plan_id from Impulse Pro when plan is seeded', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(null) // no conflict
        .mockResolvedValueOnce(savedBusiness); // validateBusiness reload
      planRepo.findOne.mockResolvedValueOnce(mockPlan);
      businessRepo.create.mockReturnValueOnce(savedBusiness);
      businessRepo.save.mockResolvedValueOnce(savedBusiness);

      const result = await service.register({
        name: 'Nueva Empresa',
        email: 'nueva@test.com',
        password: 'Pass123!',
      });

      expect(businessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: mockPlan.id }),
      );
      expect(result.user.crm_user_id).toBeNull();
    });
  });

  describe('Role Management', () => {
    describe('getAllRoles()', () => {
      it('returns filtered roles ordered by name', async () => {
        const mockRoles = [
          { id: '1', name: 'admin', label: 'Administrador' },
          { id: '2', name: 'agent', label: 'Agente' },
        ];
        mockQueryBuilder.getMany.mockResolvedValueOnce(mockRoles);

        const result = await service.getAllRoles({
          id: 'biz-id',
          email: 'test@biz.com',
        } as Business);
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
          business_id: 'biz-id',
          role_id: 'custom-id',
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
});
