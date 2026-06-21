import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Business, PlanStatus } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { Permission } from './entities/permission.entity';

const HASHED = bcrypt.hashSync('Password123!', 10);

const mockBusiness: Partial<Business> = {
  id: 'biz-uuid',
  name: 'Test Biz',
  email: 'biz@test.com',
  password_hash: HASHED,
  plan_status: PlanStatus.ACTIVE,
};

const mockCrmUser: Partial<CrmUser> = {
  id: 'user-uuid',
  email: 'agent@test.com',
  role: UserRole.AGENT,
  password_hash: HASHED,
  business_id: 'biz-uuid',
  is_active: true,
};

describe('AuthService — unified login', () => {
  let service: AuthService;

  const businessRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const planRepo = { findOne: jest.fn() };

  const crmUserRepo = { findOne: jest.fn() };

  const roleRepo = { findOne: jest.fn(), find: jest.fn() };
  const menuRepo = { find: jest.fn() };
  const permissionRepo = { find: jest.fn() };

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

  describe('getAllRoles()', () => {
    it('returns all roles ordered by name', async () => {
      const mockRoles = [
        { id: '1', name: 'admin', label: 'Administrador' },
        { id: '2', name: 'agent', label: 'Agente' },
      ];
      roleRepo.find.mockResolvedValueOnce(mockRoles);

      const result = await service.getAllRoles();
      expect(result).toEqual(mockRoles);
      expect(roleRepo.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });
  });
});
