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
});
