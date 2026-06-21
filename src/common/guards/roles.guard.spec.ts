import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@crm/enums/user-role.enum';
import { ROLES_KEY } from '@common/decorators/roles.decorator';

function buildContext(role: string | undefined, requiredRoles?: UserRole[], isPublic = false): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'isPublic') return isPublic;
      if (key === ROLES_KEY) return requiredRoles;
      return undefined;
    }),
  };

  const guard = new RolesGuard(reflector as unknown as Reflector);

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;

  return { guard, mockContext, reflector } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  const makeContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('allows all when no @Roles() is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('agent'))).toBe(true);
  });

  it('allows all when @Roles() array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext('agent'))).toBe(true);
  });

  it('allows ADMIN when @Roles(ADMIN) is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([UserRole.ADMIN]); // roles
    expect(guard.canActivate(makeContext(UserRole.ADMIN))).toBe(true);
  });

  it('denies AGENT when @Roles(ADMIN) is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(UserRole.AGENT))).toBe(false);
  });

  it('allows MANAGER when @Roles(ADMIN, MANAGER) is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.MANAGER]);
    expect(guard.canActivate(makeContext(UserRole.MANAGER))).toBe(true);
  });

  it('denies when user has no role', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('allows @Public() routes regardless of @Roles()', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(true) // isPublic = true
      .mockReturnValueOnce([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });
});
