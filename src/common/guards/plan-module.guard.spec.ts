import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanModuleGuard } from './plan-module.guard';
import {
  PlanModule,
  ModuleAccessLevel,
} from '../../modules/auth/entities/plan-module.entity';

const { FULL, READ_ONLY, LOCKED } = ModuleAccessLevel;
const PLAN_ID = 'plan-test-uuid';

// ── Session shapes ────────────────────────────────────────────────────────────
// JwtStrategy.validate() spreads the Business entity directly into request.user
// and appends crm_user_id + role. Both session types share the same plan_id
// because it comes from the Business record fetched by payload.sub (business_id).

const adminSession = {
  id: 'biz-1',
  name: 'Acme',
  email: 'acme@test.com',
  plan_id: PLAN_ID,
  plan_status: 'active',
  crm_user_id: null,
  role: 'admin',
};
// CRM manager: belongs to the same business, plan_id is inherited from it
const managerSession = {
  ...adminSession,
  crm_user_id: 'usr-mgr-1',
  role: 'manager',
};
// CRM agent: same business → same plan_id
const agentSession = {
  ...adminSession,
  crm_user_id: 'usr-agt-1',
  role: 'agent',
};
// Edge-case: business created before plan was seeded
const noPlanSession = { ...adminSession, plan_id: null };

// ── Test infrastructure ───────────────────────────────────────────────────────

function makeContext(user: unknown, method = 'GET'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, method }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/**
 * Returns a mock DataSource whose PlanModule repository looks up access levels
 * from the `modules` map and whose Menu repository resolves parent keys from
 * the `menuParents` map.
 */
function makeDataSource(
  modules: Record<string, ModuleAccessLevel>,
  menuParents: Record<string, string | null> = {},
) {
  const pmFindOne = jest.fn(
    ({ where }: { where: { plan_id: string; menu_key: string } }) => {
      if (where.plan_id !== PLAN_ID) return Promise.resolve(null);
      const lvl = modules[where.menu_key];
      return Promise.resolve(lvl ? { access_level: lvl } : null);
    },
  );
  const menuFindOne = jest.fn(({ where }: { where: { key: string } }) => {
    if (where.key in menuParents) {
      return Promise.resolve({
        key: where.key,
        parent_key: menuParents[where.key],
      });
    }
    return Promise.resolve(null);
  });
  return {
    getRepository: (Entity: unknown) =>
      Entity === PlanModule ? { findOne: pmFindOne } : { findOne: menuFindOne },
  };
}

function makeGuard(
  menuKey: string | null,
  modules: Record<string, ModuleAccessLevel>,
  menuParents: Record<string, string | null> = {},
): PlanModuleGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(menuKey),
  } as unknown as Reflector;
  return new PlanModuleGuard(
    reflector,
    makeDataSource(modules, menuParents) as unknown as DataSource,
  );
}

/** Runs canActivate expecting it to throw, returns the ForbiddenException. */
async function catchForbidden(
  guard: PlanModuleGuard,
  ctx: ExecutionContext,
): Promise<ForbiddenException> {
  const err = await guard.canActivate(ctx).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ForbiddenException);
  return err as ForbiddenException;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlanModuleGuard', () => {
  // ── 1. Guard bypass ──────────────────────────────────────────────────────────

  describe('No @RequiresModule decorator', () => {
    it('returns true — endpoint is freely accessible', async () => {
      const guard = makeGuard(null, {});
      await expect(guard.canActivate(makeContext(adminSession))).resolves.toBe(
        true,
      );
    });
  });

  // ── 2. Session validation failures ──────────────────────────────────────────

  describe('Missing / invalid session', () => {
    it('returns false when request.user is null', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(guard.canActivate(makeContext(null))).resolves.toBe(false);
    });

    it('returns false when request.user is undefined', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(
        false,
      );
    });

    it('returns false when user has no plan_id (business created before plan seed)', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(guard.canActivate(makeContext(noPlanSession))).resolves.toBe(
        false,
      );
    });
  });

  // ── 3. Business-owner session (crm_user_id: null, role: admin) ──────────────

  describe('Business-owner session — crm_user_id: null, role: admin', () => {
    describe('Module access → FULL', () => {
      it('GET allowed', async () => {
        const guard = makeGuard('crm', { crm: FULL });
        await expect(
          guard.canActivate(makeContext(adminSession, 'GET')),
        ).resolves.toBe(true);
      });

      it('POST allowed', async () => {
        const guard = makeGuard('crm', { crm: FULL });
        await expect(
          guard.canActivate(makeContext(adminSession, 'POST')),
        ).resolves.toBe(true);
      });

      it('PATCH allowed', async () => {
        const guard = makeGuard('crm', { crm: FULL });
        await expect(
          guard.canActivate(makeContext(adminSession, 'PATCH')),
        ).resolves.toBe(true);
      });

      it('DELETE allowed', async () => {
        const guard = makeGuard('crm', { crm: FULL });
        await expect(
          guard.canActivate(makeContext(adminSession, 'DELETE')),
        ).resolves.toBe(true);
      });
    });

    describe('Module access → LOCKED', () => {
      it('throws ForbiddenException', async () => {
        const guard = makeGuard('crm', { crm: LOCKED });
        await expect(
          guard.canActivate(makeContext(adminSession)),
        ).rejects.toThrow(ForbiddenException);
      });

      it('response has code MODULE_LOCKED and the module key', async () => {
        const guard = makeGuard('crm', { crm: LOCKED });
        const err = await catchForbidden(guard, makeContext(adminSession));
        expect(err.getResponse()).toMatchObject({
          code: 'MODULE_LOCKED',
          module: 'crm',
        });
      });
    });

    describe('Module access → READ_ONLY', () => {
      it('GET allowed', async () => {
        const guard = makeGuard('settings', { settings: READ_ONLY });
        await expect(
          guard.canActivate(makeContext(adminSession, 'GET')),
        ).resolves.toBe(true);
      });

      it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
        '%s throws MODULE_READ_ONLY',
        async (method) => {
          const guard = makeGuard('settings', { settings: READ_ONLY });
          const err = await catchForbidden(
            guard,
            makeContext(adminSession, method),
          );
          expect(err.getResponse()).toMatchObject({
            code: 'MODULE_READ_ONLY',
            module: 'settings',
          });
        },
      );
    });
  });

  // ── 4. CRM user — manager session ───────────────────────────────────────────

  describe('CRM user session — crm_user_id set, role: manager', () => {
    it('FULL → GET allowed', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(
        guard.canActivate(makeContext(managerSession, 'GET')),
      ).resolves.toBe(true);
    });

    it('FULL → POST allowed', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(
        guard.canActivate(makeContext(managerSession, 'POST')),
      ).resolves.toBe(true);
    });

    it('LOCKED → throws MODULE_LOCKED', async () => {
      const guard = makeGuard('crm', { crm: LOCKED });
      const err = await catchForbidden(guard, makeContext(managerSession));
      expect(err.getResponse()).toMatchObject({ code: 'MODULE_LOCKED' });
    });

    it('READ_ONLY → GET allowed', async () => {
      const guard = makeGuard('inbox_channels', { inbox_channels: READ_ONLY });
      await expect(
        guard.canActivate(makeContext(managerSession, 'GET')),
      ).resolves.toBe(true);
    });

    it('READ_ONLY → PATCH throws MODULE_READ_ONLY', async () => {
      const guard = makeGuard('inbox_channels', { inbox_channels: READ_ONLY });
      const err = await catchForbidden(
        guard,
        makeContext(managerSession, 'PATCH'),
      );
      expect(err.getResponse()).toMatchObject({ code: 'MODULE_READ_ONLY' });
    });
  });

  // ── 5. CRM user — agent session ─────────────────────────────────────────────

  describe('CRM user session — crm_user_id set, role: agent', () => {
    it('FULL → allowed', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      await expect(guard.canActivate(makeContext(agentSession))).resolves.toBe(
        true,
      );
    });

    it('LOCKED → throws MODULE_LOCKED', async () => {
      const guard = makeGuard('funnels', { funnels: LOCKED });
      await expect(
        guard.canActivate(makeContext(agentSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('access result equals admin session — plan_id resolves from Business, not from role', async () => {
      const guard = makeGuard('crm', { crm: FULL });
      const adminResult = await guard.canActivate(makeContext(adminSession));
      const agentResult = await guard.canActivate(makeContext(agentSession));
      expect(adminResult).toBe(agentResult);
    });
  });

  // ── 6. Parent-key inheritance ────────────────────────────────────────────────

  describe('Parent-key inheritance (sub-key not explicit in plan_modules)', () => {
    const crmMenuParents = {
      crm_contacts: 'crm',
      crm_tags: 'crm',
      crm_tasks: 'crm',
      crm_leads: 'crm',
    };

    it('crm_tags inherits FULL from crm → allowed', async () => {
      const guard = makeGuard('crm_tags', { crm: FULL }, crmMenuParents);
      await expect(guard.canActivate(makeContext(adminSession))).resolves.toBe(
        true,
      );
    });

    it('crm_contacts inherits LOCKED from crm → throws MODULE_LOCKED', async () => {
      const guard = makeGuard('crm_contacts', { crm: LOCKED }, crmMenuParents);
      const err = await catchForbidden(guard, makeContext(adminSession));
      expect(err.getResponse()).toMatchObject({
        code: 'MODULE_LOCKED',
        module: 'crm_contacts',
      });
    });

    it('crm_tags inherits READ_ONLY → GET allowed', async () => {
      const guard = makeGuard('crm_tags', { crm: READ_ONLY }, crmMenuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'GET')),
      ).resolves.toBe(true);
    });

    it('crm_tags inherits READ_ONLY → PATCH blocked', async () => {
      const guard = makeGuard('crm_tags', { crm: READ_ONLY }, crmMenuParents);
      const err = await catchForbidden(
        guard,
        makeContext(adminSession, 'PATCH'),
      );
      expect(err.getResponse()).toMatchObject({
        code: 'MODULE_READ_ONLY',
        module: 'crm_tags',
      });
    });

    it('explicit sub-key takes precedence over parent (crm_tags: FULL overrides crm: LOCKED)', async () => {
      const guard = makeGuard(
        'crm_tags',
        { crm: LOCKED, crm_tags: FULL },
        crmMenuParents,
      );
      await expect(guard.canActivate(makeContext(adminSession))).resolves.toBe(
        true,
      );
    });

    it('defaults to LOCKED when sub-key has no entry and no parent_key in Menu table', async () => {
      // No menuParents → Menu.findOne returns null → parent lookup skipped → defaults to LOCKED
      const guard = makeGuard('crm_tags', { crm: FULL });
      await expect(
        guard.canActivate(makeContext(adminSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('parent inheritance works for manager session', async () => {
      const guard = makeGuard('crm_contacts', { crm: FULL }, crmMenuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).resolves.toBe(true);
    });

    it('parent inheritance works for agent session', async () => {
      const guard = makeGuard('crm_tasks', { crm: FULL }, crmMenuParents);
      await expect(guard.canActivate(makeContext(agentSession))).resolves.toBe(
        true,
      );
    });
  });

  // ── 7. Plan: BrandStart ──────────────────────────────────────────────────────

  describe('BrandStart plan — CRM locked, settings read-only', () => {
    const modules: Record<string, ModuleAccessLevel> = {
      dashboard: FULL,
      crm: LOCKED,
      billing: FULL,
      settings: READ_ONLY,
      settings_users: LOCKED,
    };
    const menuParents: Record<string, string> = {
      crm_contacts: 'crm',
      crm_tags: 'crm',
      settings_users: 'settings',
    };

    it('dashboard → FULL, POST allowed', async () => {
      const guard = makeGuard('dashboard', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'POST')),
      ).resolves.toBe(true);
    });

    it('crm → LOCKED', async () => {
      const guard = makeGuard('crm', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crm_contacts inherits LOCKED from crm', async () => {
      const guard = makeGuard('crm_contacts', modules, menuParents);
      const err = await catchForbidden(guard, makeContext(adminSession));
      expect(err.getResponse()).toMatchObject({ code: 'MODULE_LOCKED' });
    });

    it('billing → FULL, POST allowed', async () => {
      const guard = makeGuard('billing', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'POST')),
      ).resolves.toBe(true);
    });

    it('settings → READ_ONLY, GET allowed', async () => {
      const guard = makeGuard('settings', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'GET')),
      ).resolves.toBe(true);
    });

    it('settings → READ_ONLY, DELETE blocked', async () => {
      const guard = makeGuard('settings', modules, menuParents);
      const err = await catchForbidden(
        guard,
        makeContext(adminSession, 'DELETE'),
      );
      expect(err.getResponse()).toMatchObject({
        code: 'MODULE_READ_ONLY',
        module: 'settings',
      });
    });

    it('settings_users → LOCKED (explicit override, not inheriting READ_ONLY from parent)', async () => {
      const guard = makeGuard('settings_users', modules, menuParents);
      const err = await catchForbidden(guard, makeContext(adminSession));
      expect(err.getResponse()).toMatchObject({
        code: 'MODULE_LOCKED',
        module: 'settings_users',
      });
    });

    it('crm locked for manager session too', async () => {
      const guard = makeGuard('crm', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── 8. Plan: Impulse Pro ─────────────────────────────────────────────────────

  describe('Impulse Pro plan — funnels and avatar locked', () => {
    const modules: Record<string, ModuleAccessLevel> = {
      dashboard: FULL,
      crm: FULL,
      agents_ia: FULL,
      inbox: FULL,
      inbox_channels: READ_ONLY,
      funnels: LOCKED,
      avatar: LOCKED,
      analytics: FULL,
      billing: FULL,
      settings: FULL,
    };
    const menuParents: Record<string, string> = {
      funnels_dashboard: 'funnels',
      funnels_builder: 'funnels',
      avatar_voice: 'avatar',
      avatar_memory: 'avatar',
      crm_contacts: 'crm',
      inbox_channels: 'inbox',
    };

    it('crm → FULL, POST allowed (admin)', async () => {
      const guard = makeGuard('crm', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'POST')),
      ).resolves.toBe(true);
    });

    it('funnels → LOCKED', async () => {
      const guard = makeGuard('funnels', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('funnels_dashboard inherits LOCKED from funnels (admin)', async () => {
      const guard = makeGuard('funnels_dashboard', modules, menuParents);
      const err = await catchForbidden(guard, makeContext(adminSession));
      expect(err.getResponse()).toMatchObject({
        code: 'MODULE_LOCKED',
        module: 'funnels_dashboard',
      });
    });

    it('funnels_builder inherits LOCKED from funnels (manager session)', async () => {
      const guard = makeGuard('funnels_builder', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('avatar → LOCKED', async () => {
      const guard = makeGuard('avatar', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('avatar_voice inherits LOCKED from avatar (agent session)', async () => {
      const guard = makeGuard('avatar_voice', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(agentSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('avatar_memory inherits LOCKED from avatar (admin)', async () => {
      const guard = makeGuard('avatar_memory', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('inbox_channels → READ_ONLY, GET allowed', async () => {
      const guard = makeGuard('inbox_channels', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'GET')),
      ).resolves.toBe(true);
    });

    it('inbox_channels → READ_ONLY, POST blocked', async () => {
      const guard = makeGuard('inbox_channels', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(adminSession, 'POST')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crm_contacts inherits FULL from crm (manager session)', async () => {
      const guard = makeGuard('crm_contacts', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).resolves.toBe(true);
    });
  });

  // ── 9. Plan: Core Digital ────────────────────────────────────────────────────

  describe('Core Digital plan — all root modules FULL', () => {
    const modules: Record<string, ModuleAccessLevel> = {
      dashboard: FULL,
      crm: FULL,
      agents_ia: FULL,
      inbox: FULL,
      funnels: FULL,
      avatar: FULL,
      analytics: FULL,
      billing: FULL,
      settings: FULL,
    };
    const menuParents: Record<string, string> = {
      funnels_dashboard: 'funnels',
      funnels_builder: 'funnels',
      avatar_voice: 'avatar',
      avatar_memory: 'avatar',
    };

    it.each(['crm', 'funnels', 'avatar', 'analytics', 'settings', 'billing'])(
      '%s → FULL, POST allowed (admin)',
      async (key) => {
        const guard = makeGuard(key, modules, menuParents);
        await expect(
          guard.canActivate(makeContext(adminSession, 'POST')),
        ).resolves.toBe(true);
      },
    );

    it('funnels_dashboard inherits FULL → allowed (manager)', async () => {
      const guard = makeGuard('funnels_dashboard', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).resolves.toBe(true);
    });

    it('funnels_builder inherits FULL → DELETE allowed (agent)', async () => {
      const guard = makeGuard('funnels_builder', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(agentSession, 'DELETE')),
      ).resolves.toBe(true);
    });

    it('avatar_voice inherits FULL → allowed (agent)', async () => {
      const guard = makeGuard('avatar_voice', modules, menuParents);
      await expect(guard.canActivate(makeContext(agentSession))).resolves.toBe(
        true,
      );
    });

    it('avatar_memory inherits FULL → allowed (manager)', async () => {
      const guard = makeGuard('avatar_memory', modules, menuParents);
      await expect(
        guard.canActivate(makeContext(managerSession)),
      ).resolves.toBe(true);
    });
  });
});
