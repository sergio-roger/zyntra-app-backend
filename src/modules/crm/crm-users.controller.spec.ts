import { Test, TestingModule } from '@nestjs/testing';
import { CrmUsersController } from './crm-users.controller';
import { CrmUsersService } from './crm-users.service';
import { RolesGuard } from '@common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { Business } from '@auth/entities/business.entity';
import { CrmUser } from './entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';

const mockBusiness = { id: 'business-uuid-1234', name: 'Test Business' } as Business;

const mockCrmUser = {
  id: 'user-uuid-1',
  business_id: 'business-uuid-1234',
  name: 'John Doe',
  email: 'john@example.com',
} as CrmUser;

describe('CrmUsersController', () => {
  let controller: CrmUsersController;
  let service: CrmUsersService;

  const mockUsersService = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmUsersController],
      providers: [
        { provide: CrmUsersService, useValue: mockUsersService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CrmUsersController>(CrmUsersController);
    service = module.get<CrmUsersService>(CrmUsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call usersService.list with the current business', async () => {
      mockUsersService.list.mockResolvedValue([mockCrmUser]);
      const result = await controller.list(mockBusiness);
      expect(service.list).toHaveBeenCalledWith(mockBusiness);
      expect(result).toEqual([mockCrmUser]);
    });
  });

  describe('create', () => {
    it('should call usersService.create with current business and dto', async () => {
      const createDto = { name: 'Alice Smith', email: 'alice@example.com', role: UserRole.AGENT };
      mockUsersService.create.mockResolvedValue({ id: 'new-uuid', ...createDto, business_id: mockBusiness.id });
      const result = await controller.create(mockBusiness, createDto);
      expect(service.create).toHaveBeenCalledWith(mockBusiness, createDto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('should call usersService.update', async () => {
      const updateDto = { name: 'John Doe Updated' };
      mockUsersService.update.mockResolvedValue({ ...mockCrmUser, name: updateDto.name });
      const result = await controller.update(mockBusiness, 'user-uuid-1', updateDto);
      expect(service.update).toHaveBeenCalledWith(mockBusiness, 'user-uuid-1', updateDto);
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should call usersService.remove', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);
      const result = await controller.remove(mockBusiness, 'user-uuid-1');
      expect(service.remove).toHaveBeenCalledWith(mockBusiness, 'user-uuid-1');
      expect(result).toBeUndefined();
    });
  });
});

describe('CrmUsersController — RBAC metadata', () => {
  it('list requires ADMIN or MANAGER roles', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      CrmUsersController.prototype.list,
    );
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
    expect(roles).not.toContain(UserRole.AGENT);
  });

  it('create requires only ADMIN role', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      CrmUsersController.prototype.create,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('update requires only ADMIN role', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      CrmUsersController.prototype.update,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('remove requires only ADMIN role', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      CrmUsersController.prototype.remove,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
