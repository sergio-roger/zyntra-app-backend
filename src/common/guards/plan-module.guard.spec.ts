import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { PlanModuleGuard } from './plan-module.guard';
import { ModuleAccessLevel } from '../../modules/auth/entities/plan-module.entity';

describe('PlanModuleGuard', () => {
  let guard: PlanModuleGuard;
  let reflector: jest.Mocked<Reflector>;
  let dataSource: jest.Mocked<DataSource>;
  let mockPlanModuleRepo: any;
  let mockMenuRepo: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockPlanModuleRepo = {
      findOne: jest.fn(),
    };

    mockMenuRepo = {
      findOne: jest.fn(),
    };

    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'PlanModule') {
          return mockPlanModuleRepo;
        }
        if (entity.name === 'Menu') {
          return mockMenuRepo;
        }
        return null;
      }),
    } as unknown as jest.Mocked<DataSource>;

    guard = new PlanModuleGuard(reflector, dataSource);
  });

  const makeContext = (method: string, planId: string = 'plan-123') =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          user: {
            business: {
              plan_id: planId,
            },
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when no module requirement is defined', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(makeContext('GET'));
    expect(result).toBe(true);
  });

  it('allows access when plan module level is FULL', async () => {
    reflector.getAllAndOverride.mockReturnValue('crm_contacts');
    mockPlanModuleRepo.findOne.mockResolvedValue({
      access_level: ModuleAccessLevel.FULL,
    });

    const result = await guard.canActivate(makeContext('POST'));
    expect(result).toBe(true);
    expect(mockPlanModuleRepo.findOne).toHaveBeenCalledWith({
      where: { plan_id: 'plan-123', menu_key: 'crm_contacts' },
    });
  });

  it('throws ForbiddenException with MODULE_LOCKED when access level is LOCKED', async () => {
    reflector.getAllAndOverride.mockReturnValue('agents_ia');
    mockPlanModuleRepo.findOne.mockResolvedValue({
      access_level: ModuleAccessLevel.LOCKED,
    });

    await expect(guard.canActivate(makeContext('GET'))).rejects.toThrow(
      ForbiddenException,
    );

    try {
      await guard.canActivate(makeContext('GET'));
    } catch (e: any) {
      expect(e.getResponse().code).toBe('MODULE_LOCKED');
      expect(e.getResponse().upgrade_to).toBe('Impulse Pro');
    }
  });

  it('allows GET requests when access level is READ_ONLY', async () => {
    reflector.getAllAndOverride.mockReturnValue('crm_contacts');
    mockPlanModuleRepo.findOne.mockResolvedValue({
      access_level: ModuleAccessLevel.READ_ONLY,
    });

    const result = await guard.canActivate(makeContext('GET'));
    expect(result).toBe(true);
  });

  it('throws ForbiddenException with MODULE_READ_ONLY on write methods when access level is READ_ONLY', async () => {
    reflector.getAllAndOverride.mockReturnValue('crm_contacts');
    mockPlanModuleRepo.findOne.mockResolvedValue({
      access_level: ModuleAccessLevel.READ_ONLY,
    });

    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    for (const method of writeMethods) {
      await expect(guard.canActivate(makeContext(method))).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await guard.canActivate(makeContext(method));
      } catch (e: any) {
        expect(e.getResponse().code).toBe('MODULE_READ_ONLY');
      }
    }
  });

  it('inherits access level from parent menu when child has no explicit matrix row', async () => {
    reflector.getAllAndOverride.mockReturnValue('crm_contacts');
    // First call for crm_contacts returns null (no explicit level)
    mockPlanModuleRepo.findOne.mockResolvedValueOnce(null);
    // Menu lookup returns the menu with parent_key
    mockMenuRepo.findOne.mockResolvedValue({
      key: 'crm_contacts',
      parent_key: 'crm',
    });
    // Second call for parent key 'crm' returns FULL
    mockPlanModuleRepo.findOne.mockResolvedValueOnce({
      access_level: ModuleAccessLevel.FULL,
    });

    const result = await guard.canActivate(makeContext('POST'));
    expect(result).toBe(true);

    expect(mockMenuRepo.findOne).toHaveBeenCalledWith({
      where: { key: 'crm_contacts' },
    });
    expect(mockPlanModuleRepo.findOne).toHaveBeenLastCalledWith({
      where: { plan_id: 'plan-123', menu_key: 'crm' },
    });
  });
});
