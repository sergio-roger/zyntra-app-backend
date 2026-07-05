/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
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
    it('calls authService.getMenuTree with the correct parameters and returns the menu tree', async () => {
      const mockBusiness = {
        id: 'biz-123',
        name: 'Test Business',
        plan_id: 'plan-123',
        plan_status: PlanStatus.ACTIVE,
        trial_ends_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        plan_object: null,
      } as unknown as Business;

      const req = { user: { role: UserRole.ADMIN } } as any;

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

      const result = await controller.getMenus(req, mockBusiness);

      expect(authService.getMenuTree).toHaveBeenCalledWith(
        UserRole.ADMIN,
        mockBusiness.id,
        mockBusiness.plan_id,
      );
      expect(result).toBe(mockMenuTree);
    });
  });

  describe('Self-service profile endpoints (IDOR safety)', () => {
    const req = { user: { id: 'user-uuid' } } as any;

    it('getProfile scopes to the caller id from the token', async () => {
      mockAuthService.getSelfProfile.mockResolvedValueOnce({ id: 'user-uuid' });

      await controller.getProfile(req);

      expect(authService.getSelfProfile).toHaveBeenCalledWith('user-uuid');
    });

    it('updateProfile scopes to the caller id from the token, never a body-supplied id', async () => {
      const dto = { firstName: 'Nuevo' } as any;
      mockAuthService.updateProfile.mockResolvedValueOnce({ id: 'user-uuid' });

      await controller.updateProfile(dto, req);

      expect(authService.updateProfile).toHaveBeenCalledWith('user-uuid', dto);
    });

    it('uploadAvatar scopes to the caller id from the token', async () => {
      const file = {
        buffer: Buffer.from('x'),
        mimetype: 'image/png',
        size: 10,
      } as any;
      mockAuthService.uploadAvatar.mockResolvedValueOnce({
        avatarUrl: 'http://localhost:3000/uploads/avatars/x.png',
      });

      await controller.uploadAvatar(file, req);

      expect(authService.uploadAvatar).toHaveBeenCalledWith('user-uuid', file);
    });

    it('removeAvatar scopes to the caller id from the token', async () => {
      mockAuthService.removeAvatar.mockResolvedValueOnce(undefined);

      await controller.removeAvatar(req);

      expect(authService.removeAvatar).toHaveBeenCalledWith('user-uuid');
    });

    it('changePassword scopes to the caller id from the token', async () => {
      const dto = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword2',
      };
      mockAuthService.changePassword.mockResolvedValueOnce(undefined);

      await controller.changePassword(dto, req);

      expect(authService.changePassword).toHaveBeenCalledWith('user-uuid', dto);
    });

    it('refresh scopes to the caller id from the token', async () => {
      mockAuthService.refresh.mockResolvedValueOnce({
        access_token: 'new-token',
        user: { id: 'user-uuid' },
      });

      await controller.refresh(req);

      expect(authService.refresh).toHaveBeenCalledWith('user-uuid');
    });
  });
});
