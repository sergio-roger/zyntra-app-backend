import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@crm/enums/user-role.enum';
import { Business, PlanStatus } from './entities/business.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    refresh: jest.fn(),
    getMenuTree: jest.fn(),
    getSelfProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMenus', () => {
    it('should call authService.getMenuTree with the correct parameters and return the menu tree', async () => {
      const mockCaller = { id: 'user-123', role: 'admin' };
      const mockBusiness = {
        id: 'biz-123',
        name: 'Test Business',
        email: 'test@business.com',
        password_hash: 'hash',
        plan_id: 'plan-123',
        plan_status: PlanStatus.ACTIVE,
        trial_ends_at: new Date(),
        stripe_customer_id: 'cus_test123',
        created_at: new Date(),
        updated_at: new Date(),
        crmUsers: [],
        plan_object: null,
      } as unknown as Business;

      const mockMenuTree = [
        {
          key: 'dashboard',
          label: 'Dashboard',
          path: '/dashboard',
          access_level: 'full',
          children: [],
        },
      ];

      mockAuthService.getMenuTree.mockResolvedValue(mockMenuTree);

      const result = await controller.getMenus(mockCaller, mockBusiness);

      expect(authService.getMenuTree).toHaveBeenCalledWith(
        UserRole.ADMIN,
        mockBusiness.id,
        mockBusiness.plan_id,
      );
      expect(result).toBe(mockMenuTree);
    });
  });

  describe('Self-service profile endpoints (IDOR safety)', () => {
    const req = {
      user: { id: 'biz-123', crm_user_id: 'crm-user-1' },
    } as any;
    const caller = { id: 'crm-user-1', role: UserRole.AGENT };

    it('updateProfile always scopes to the caller from the token, never a body-supplied id', async () => {
      const dto = { firstName: 'Nuevo' } as any;
      mockAuthService.updateProfile.mockResolvedValueOnce({ id: 'biz-123' });

      await controller.updateProfile(dto, req, caller);

      expect(authService.updateProfile).toHaveBeenCalledWith(
        'biz-123',
        'crm-user-1',
        dto,
        UserRole.AGENT,
      );
    });

    it('uploadAvatar scopes to the caller from the token', async () => {
      const file = {
        buffer: Buffer.from('x'),
        mimetype: 'image/png',
        size: 10,
      } as any;
      mockAuthService.uploadAvatar.mockResolvedValueOnce({
        avatarUrl: 'http://localhost:3000/uploads/avatars/x.png',
      });

      await controller.uploadAvatar(file, req);

      expect(authService.uploadAvatar).toHaveBeenCalledWith(
        'biz-123',
        'crm-user-1',
        file,
      );
    });

    it('removeAvatar scopes to the caller from the token', async () => {
      mockAuthService.removeAvatar.mockResolvedValueOnce(undefined);

      await controller.removeAvatar(req);

      expect(authService.removeAvatar).toHaveBeenCalledWith(
        'biz-123',
        'crm-user-1',
      );
    });

    it('changePassword scopes to the caller from the token', async () => {
      const dto = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword2',
      };
      mockAuthService.changePassword.mockResolvedValueOnce(undefined);

      await controller.changePassword(dto, req);

      expect(authService.changePassword).toHaveBeenCalledWith(
        'biz-123',
        'crm-user-1',
        dto,
      );
    });

    it('falls back to the business id when crm_user_id is absent (business-direct login)', async () => {
      const businessReq = { user: { id: 'biz-999' } } as any;
      mockAuthService.getSelfProfile.mockResolvedValueOnce({ id: 'biz-999' });

      await controller.getProfile(businessReq, {
        id: 'biz-999',
        role: UserRole.ADMIN,
      });

      expect(authService.getSelfProfile).toHaveBeenCalledWith(
        'biz-999',
        null,
        UserRole.ADMIN,
      );
    });
  });
});
