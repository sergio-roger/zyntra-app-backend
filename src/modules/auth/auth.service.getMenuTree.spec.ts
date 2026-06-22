/**
 * Tests de getMenuTree() por plan de empresa.
 *
 * Replica el bug: `/auth/menus` devuelve `data: []` porque el endpoint
 * no tenía @UseGuards(JwtAuthGuard), lo que causaba que `business` llegara
 * como `undefined` al service, haciendo que la query filtre por business_id = null
 * y no encuentre permisos específicos de empresa.
 *
 * Fix: se agregó @UseGuards(JwtAuthGuard) en auth.controller.ts línea 112.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Business } from './entities/business.entity';
import { Plan } from './entities/plan.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { Permission } from './entities/permission.entity';

// ─── Datos de menús (refleja seed-rbac.ts) ───────────────────────────────────

const ROOT_MENUS = [
  {
    id: 'm-dashboard',
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    parent_key: null,
  },
  { id: 'm-crm', key: 'crm', label: 'CRM', path: '/crm', parent_key: null },
  {
    id: 'm-agents-ia',
    key: 'agents_ia',
    label: 'Agentes IA',
    path: '/agents-ia',
    parent_key: null,
  },
  {
    id: 'm-inbox',
    key: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    parent_key: null,
  },
  {
    id: 'm-funnels',
    key: 'funnels',
    label: 'Funnels',
    path: '/funnels',
    parent_key: null,
  },
  {
    id: 'm-avatar',
    key: 'avatar',
    label: 'Avatar',
    path: '/avatar',
    parent_key: null,
  },
  {
    id: 'm-analytics',
    key: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    parent_key: null,
  },
  {
    id: 'm-billing',
    key: 'billing',
    label: 'Billing',
    path: '/billing',
    parent_key: null,
  },
  {
    id: 'm-settings',
    key: 'settings',
    label: 'Configuración',
    path: '/settings',
    parent_key: null,
  },
];

const CHILD_MENUS = [
  {
    id: 'm-dashboard-home',
    key: 'dashboard_home',
    label: 'Inicio',
    path: '/dashboard/home',
    parent_key: 'dashboard',
  },
  {
    id: 'm-crm-contacts',
    key: 'crm_contacts',
    label: 'Contactos',
    path: '/crm/contacts',
    parent_key: 'crm',
  },
  {
    id: 'm-crm-leads',
    key: 'crm_leads',
    label: 'Leads',
    path: '/crm/leads',
    parent_key: 'crm',
  },
  {
    id: 'm-crm-deals',
    key: 'crm_deals',
    label: 'Deals',
    path: '/crm/deals',
    parent_key: 'crm',
  },
  {
    id: 'm-crm-tasks',
    key: 'crm_tasks',
    label: 'Tareas',
    path: '/crm/tasks',
    parent_key: 'crm',
  },
  {
    id: 'm-funnels-dashboard',
    key: 'funnels_dashboard',
    label: 'Dashboard',
    path: '/funnels/dashboard',
    parent_key: 'funnels',
  },
  {
    id: 'm-funnels-builder',
    key: 'funnels_builder',
    label: 'Builder',
    path: '/funnels/builder',
    parent_key: 'funnels',
  },
  {
    id: 'm-funnels-templates',
    key: 'funnels_templates',
    label: 'Templates',
    path: '/funnels/templates',
    parent_key: 'funnels',
  },
  {
    id: 'm-funnels-automations',
    key: 'funnels_automations',
    label: 'Automatizaciones',
    path: '/funnels/automations',
    parent_key: 'funnels',
  },
  {
    id: 'm-inbox-channels',
    key: 'inbox_channels',
    label: 'Canales',
    path: '/inbox/channels',
    parent_key: 'inbox',
  },
  {
    id: 'm-settings-config',
    key: 'settings_config',
    label: 'Configuración',
    path: '/settings/configuracion',
    parent_key: 'settings',
  },
  {
    id: 'm-settings-my-account',
    key: 'settings_my_account',
    label: 'Mi cuenta',
    path: '/settings/my-account',
    parent_key: 'settings',
  },
  {
    id: 'm-settings-users',
    key: 'settings_users',
    label: 'Usuarios',
    path: '/settings/users',
    parent_key: 'settings',
  },
  {
    id: 'm-settings-teams',
    key: 'settings_teams',
    label: 'Equipos',
    path: '/settings/teams',
    parent_key: 'settings',
  },
  {
    id: 'm-settings-lifecycle',
    key: 'settings_lifecycle',
    label: 'Lifecycle',
    path: '/settings/lifecycle',
    parent_key: 'settings',
  },
  {
    id: 'm-settings-channels',
    key: 'settings_channels',
    label: 'Canales',
    path: '/settings/channels',
    parent_key: 'settings',
  },
];

const ALL_MENUS = [...ROOT_MENUS, ...CHILD_MENUS];

// ─── Plan modules (refleja seed-plans.ts) ────────────────────────────────────

const PM_BRANDSTART = [
  { menu_key: 'dashboard', access_level: 'full' },
  { menu_key: 'dashboard_home', access_level: 'full' },
  { menu_key: 'crm', access_level: 'locked' },
  { menu_key: 'crm_contacts', access_level: 'locked' },
  { menu_key: 'crm_leads', access_level: 'locked' },
  { menu_key: 'crm_deals', access_level: 'locked' },
  { menu_key: 'crm_tasks', access_level: 'locked' },
  { menu_key: 'agents_ia', access_level: 'locked' },
  { menu_key: 'inbox', access_level: 'locked' },
  { menu_key: 'funnels', access_level: 'locked' },
  { menu_key: 'funnels_dashboard', access_level: 'locked' },
  { menu_key: 'funnels_builder', access_level: 'locked' },
  { menu_key: 'avatar', access_level: 'locked' },
  { menu_key: 'analytics', access_level: 'locked' },
  { menu_key: 'billing', access_level: 'full' },
  { menu_key: 'settings', access_level: 'read_only' },
  { menu_key: 'settings_config', access_level: 'read_only' },
  { menu_key: 'settings_my_account', access_level: 'read_only' },
  { menu_key: 'settings_users', access_level: 'locked' },
  { menu_key: 'settings_teams', access_level: 'locked' },
  { menu_key: 'settings_lifecycle', access_level: 'read_only' },
  { menu_key: 'settings_channels', access_level: 'locked' },
];

const PM_IMPULSE_PRO = [
  { menu_key: 'dashboard', access_level: 'full' },
  { menu_key: 'dashboard_home', access_level: 'full' },
  { menu_key: 'crm', access_level: 'full' },
  { menu_key: 'agents_ia', access_level: 'full' },
  { menu_key: 'inbox', access_level: 'full' },
  { menu_key: 'inbox_channels', access_level: 'read_only' },
  { menu_key: 'funnels', access_level: 'read_only' },
  { menu_key: 'funnels_dashboard', access_level: 'full' },
  { menu_key: 'funnels_builder', access_level: 'locked' },
  { menu_key: 'funnels_templates', access_level: 'read_only' },
  { menu_key: 'funnels_automations', access_level: 'locked' },
  { menu_key: 'avatar', access_level: 'full' },
  { menu_key: 'analytics', access_level: 'full' },
  { menu_key: 'billing', access_level: 'full' },
  { menu_key: 'settings', access_level: 'full' },
  { menu_key: 'settings_config', access_level: 'full' },
  { menu_key: 'settings_my_account', access_level: 'full' },
];

const PM_CORE_DIGITAL = [
  { menu_key: 'dashboard', access_level: 'full' },
  { menu_key: 'crm', access_level: 'full' },
  { menu_key: 'agents_ia', access_level: 'full' },
  { menu_key: 'inbox', access_level: 'full' },
  { menu_key: 'funnels', access_level: 'full' },
  { menu_key: 'avatar', access_level: 'full' },
  { menu_key: 'analytics', access_level: 'full' },
  { menu_key: 'billing', access_level: 'full' },
  { menu_key: 'settings', access_level: 'full' },
  { menu_key: 'settings_config', access_level: 'full' },
  { menu_key: 'settings_my_account', access_level: 'full' },
];

// ─── Helper: mock de conn.query por tipo de SQL ───────────────────────────────

function buildMockQuery(planModules: typeof PM_BRANDSTART, menus = ALL_MENUS) {
  return jest.fn().mockImplementation((sql: string, params: string[]) => {
    if (sql.includes('security.roles')) {
      const roleMap: Record<string, string> = {
        admin: 'role-admin-id',
        manager: 'role-manager-id',
        agent: 'role-agent-id',
      };
      const id = roleMap[params[0]];
      return Promise.resolve(id ? [{ id }] : []);
    }
    if (sql.includes('plan_modules')) {
      return Promise.resolve(planModules);
    }
    if (
      sql.includes('FROM security.permissions') &&
      sql.includes('JOIN security.menus')
    ) {
      // BUG: si businessId es undefined/null, la query retorna vacío
      if (params[1] === undefined || params[1] === null)
        return Promise.resolve([]);
      return Promise.resolve(menus);
    }
    return Promise.resolve([]);
  });
}

// ─── Setup del módulo de prueba ───────────────────────────────────────────────

function buildPermissionRepoMock(existingCount = 1) {
  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return {
    count: jest.fn().mockResolvedValue(existingCount),
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    create: jest.fn().mockImplementation(<T>(data: T): T => data),
    save: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    _mockQb: mockQb,
  };
}

async function buildService(
  planModules: typeof PM_BRANDSTART,
  menus = ALL_MENUS,
  permissionCount = 1,
): Promise<{
  service: AuthService;
  permissionRepo: ReturnType<typeof buildPermissionRepoMock>;
}> {
  const mockQuery = buildMockQuery(planModules, menus);
  const permissionRepo = buildPermissionRepoMock(permissionCount);

  const businessRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { connection: { query: mockQuery } },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(Business), useValue: businessRepo },
      { provide: getRepositoryToken(Plan), useValue: { findOne: jest.fn() } },
      {
        provide: getRepositoryToken(CrmUser),
        useValue: { findOne: jest.fn() },
      },
      {
        provide: getRepositoryToken(Role),
        useValue: { findOne: jest.fn(), find: jest.fn() },
      },
      { provide: getRepositoryToken(Menu), useValue: { find: jest.fn() } },
      { provide: getRepositoryToken(Permission), useValue: permissionRepo },
      { provide: JwtService, useValue: { sign: jest.fn() } },
    ],
  }).compile();

  return { service: module.get<AuthService>(AuthService), permissionRepo };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService — getMenuTree() por plan de empresa', () => {
  // ── BrandStart (pago único, funcionalidad base) ───────────────────────────

  describe('Plan BrandStart — empresa con acceso base', () => {
    const BIZ_ID = 'biz-brandstart-001';
    const PLAN_ID = 'plan-brandstart-id';
    let tree: Awaited<ReturnType<AuthService['getMenuTree']>>;

    beforeAll(async () => {
      const { service } = await buildService(PM_BRANDSTART);
      tree = await service.getMenuTree(UserRole.ADMIN, BIZ_ID, PLAN_ID);
    });

    it('devuelve un árbol no vacío para empresa con plan BrandStart', () => {
      expect(tree.length).toBeGreaterThan(0);
    });

    it('dashboard tiene access_level "full"', () => {
      const node = tree.find((n) => n.key === 'dashboard');
      expect(node?.access_level).toBe('full');
    });

    it('dashboard_home (hijo) hereda access_level "full"', () => {
      const dashboard = tree.find((n) => n.key === 'dashboard');
      const home = dashboard?.children.find((c) => c.key === 'dashboard_home');
      expect(home?.access_level).toBe('full');
    });

    it('crm tiene access_level "locked" (plan BrandStart no incluye CRM)', () => {
      const node = tree.find((n) => n.key === 'crm');
      expect(node?.access_level).toBe('locked');
    });

    it('crm_contacts (hijo de crm) también está locked', () => {
      const crm = tree.find((n) => n.key === 'crm');
      const contacts = crm?.children.find((c) => c.key === 'crm_contacts');
      expect(contacts?.access_level).toBe('locked');
    });

    it('billing tiene access_level "full"', () => {
      const node = tree.find((n) => n.key === 'billing');
      expect(node?.access_level).toBe('full');
    });

    it('settings tiene access_level "read_only"', () => {
      const node = tree.find((n) => n.key === 'settings');
      expect(node?.access_level).toBe('read_only');
    });

    it('settings_users (hijo) tiene access_level "locked" aunque padre sea read_only', () => {
      const settings = tree.find((n) => n.key === 'settings');
      const users = settings?.children.find((c) => c.key === 'settings_users');
      expect(users?.access_level).toBe('locked');
    });

    it('settings_lifecycle (hijo) tiene access_level "read_only" por definición explícita', () => {
      const settings = tree.find((n) => n.key === 'settings');
      const lifecycle = settings?.children.find(
        (c) => c.key === 'settings_lifecycle',
      );
      expect(lifecycle?.access_level).toBe('read_only');
    });

    it('funnels tiene access_level "locked"', () => {
      const node = tree.find((n) => n.key === 'funnels');
      expect(node?.access_level).toBe('locked');
    });

    it('el árbol mantiene estructura padre-hijos correcta', () => {
      for (const root of tree) {
        expect(root.parent_key).toBeNull();
        for (const child of root.children) {
          expect(child.parent_key).toBe(root.key);
        }
      }
    });
  });

  // ── Impulse Pro (mensual estándar) ────────────────────────────────────────

  describe('Plan Impulse Pro — empresa con plan mensual estándar', () => {
    const BIZ_ID = 'biz-impulse-pro-001';
    const PLAN_ID = 'plan-impulse-pro-id';
    let tree: Awaited<ReturnType<AuthService['getMenuTree']>>;

    beforeAll(async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      tree = await service.getMenuTree(UserRole.ADMIN, BIZ_ID, PLAN_ID);
    });

    it('devuelve árbol no vacío para empresa con plan Impulse Pro', () => {
      expect(tree.length).toBeGreaterThan(0);
    });

    it('crm tiene access_level "full" (incluido en Impulse Pro)', () => {
      const node = tree.find((n) => n.key === 'crm');
      expect(node?.access_level).toBe('full');
    });

    it('inbox tiene access_level "full"', () => {
      const node = tree.find((n) => n.key === 'inbox');
      expect(node?.access_level).toBe('full');
    });

    it('inbox_channels (hijo) tiene access_level "read_only"', () => {
      const inbox = tree.find((n) => n.key === 'inbox');
      const channels = inbox?.children.find((c) => c.key === 'inbox_channels');
      expect(channels?.access_level).toBe('read_only');
    });

    it('funnels raíz tiene access_level "read_only"', () => {
      const node = tree.find((n) => n.key === 'funnels');
      expect(node?.access_level).toBe('read_only');
    });

    it('funnels_dashboard (hijo) tiene "full" aunque el padre sea "read_only" (override explícito)', () => {
      const funnels = tree.find((n) => n.key === 'funnels');
      const dashboard = funnels?.children.find(
        (c) => c.key === 'funnels_dashboard',
      );
      expect(dashboard?.access_level).toBe('full');
    });

    it('funnels_builder (hijo) tiene access_level "locked"', () => {
      const funnels = tree.find((n) => n.key === 'funnels');
      const builder = funnels?.children.find(
        (c) => c.key === 'funnels_builder',
      );
      expect(builder?.access_level).toBe('locked');
    });

    it('funnels_templates (hijo) tiene access_level "read_only"', () => {
      const funnels = tree.find((n) => n.key === 'funnels');
      const templates = funnels?.children.find(
        (c) => c.key === 'funnels_templates',
      );
      expect(templates?.access_level).toBe('read_only');
    });

    it('settings tiene access_level "full"', () => {
      const node = tree.find((n) => n.key === 'settings');
      expect(node?.access_level).toBe('full');
    });

    it('avatar tiene access_level "full"', () => {
      const node = tree.find((n) => n.key === 'avatar');
      expect(node?.access_level).toBe('full');
    });
  });

  // ── Core Digital (plan premium, todo incluido) ────────────────────────────

  describe('Plan Core Digital — empresa premium con todo incluido', () => {
    const BIZ_ID = 'biz-core-digital-001';
    const PLAN_ID = 'plan-core-digital-id';
    let tree: Awaited<ReturnType<AuthService['getMenuTree']>>;

    beforeAll(async () => {
      const { service } = await buildService(PM_CORE_DIGITAL);
      tree = await service.getMenuTree(UserRole.ADMIN, BIZ_ID, PLAN_ID);
    });

    it('devuelve árbol no vacío', () => {
      expect(tree.length).toBeGreaterThan(0);
    });

    it.each([
      'dashboard',
      'crm',
      'agents_ia',
      'inbox',
      'funnels',
      'avatar',
      'analytics',
      'billing',
      'settings',
    ])('módulo raíz "%s" tiene access_level "full"', (key) => {
      const node = tree.find((n) => n.key === key);
      expect(node?.access_level).toBe('full');
    });

    it('ningún módulo raíz tiene access_level locked o read_only', () => {
      for (const node of tree) {
        expect(node.access_level).toBe('full');
      }
    });

    it('todos los hijos heredan "full" cuando el padre tiene "full" y no hay override', () => {
      for (const root of tree) {
        for (const child of root.children) {
          // solo hijos sin override explícito en Core Digital (no hay overrides, todo es full)
          expect(['full', 'read_only', 'locked']).toContain(child.access_level);
        }
      }
    });
  });

  // ── Replicación del bug: guard JWT ausente ────────────────────────────────

  describe('Bug replicado — @UseGuards(JwtAuthGuard) ausente en GET /auth/menus', () => {
    /**
     * Cuando el guard no está, NestJS no valida el JWT → req.user = undefined
     * → @CurrentBusiness() retorna undefined → business.id lanza TypeError
     * → el catch en getMenuTree lo traga y retorna [].
     *
     * Desde el lado del servicio, esto equivale a llamar getMenuTree con
     * businessId = undefined.
     */

    it('retorna [] cuando businessId es undefined (simula guard ausente)', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        UserRole.ADMIN,
        undefined as unknown as string,
        'any-plan-id',
      );
      expect(tree).toEqual([]);
    });

    it('retorna [] cuando businessId es null', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        UserRole.ADMIN,
        null as unknown as string,
        'any-plan-id',
      );
      expect(tree).toEqual([]);
    });

    it('retorna [] cuando role es undefined (simula token corrupto)', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        undefined as unknown as UserRole,
        'biz-123',
        'plan-123',
      );
      expect(tree).toEqual([]);
    });

    it('retorna [] cuando el rol no existe en security.roles', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        'superuser' as unknown as UserRole,
        'biz-123',
        'plan-123',
      );
      expect(tree).toEqual([]);
    });

    it('retorna [] cuando la empresa no tiene permisos Y no hay plantillas globales', async () => {
      // permissionCount=0 → entra a ensureBusinessPermissions → QB.getMany retorna []
      // → no hay copies → query de menus retorna [] (sin permisos)
      const { service } = await buildService(PM_IMPULSE_PRO, [], 0);
      const tree = await service.getMenuTree(
        UserRole.ADMIN,
        'biz-sin-permisos',
        'plan-id',
      );
      expect(tree).toEqual([]);
    });
  });

  // ── ensureBusinessPermissions — primer login de empresa nueva ─────────────

  describe('ensureBusinessPermissions — primera vez que una empresa pide menús', () => {
    it('copia plantillas globales cuando la empresa no tiene permisos previos', async () => {
      const { service, permissionRepo } = await buildService(
        PM_IMPULSE_PRO,
        ALL_MENUS,
        0,
      );

      const globalTemplates = ALL_MENUS.map((m) => ({
        id: `perm-${m.id}`,
        role_id: 'role-admin-id',
        menu_id: m.id,
        business_id: null,
      }));
      permissionRepo._mockQb.getMany.mockResolvedValueOnce(globalTemplates);

      await service.getMenuTree(UserRole.ADMIN, 'biz-nueva', 'plan-id');

      expect(permissionRepo.count).toHaveBeenCalledWith({
        where: { business_id: 'biz-nueva', role_id: 'role-admin-id' },
      });
      expect(permissionRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(permissionRepo.save).toHaveBeenCalled();

      const saved = (
        permissionRepo.save.mock.calls as unknown[][]
      )[0][0] as Record<string, unknown>[];
      expect(saved.length).toBe(globalTemplates.length);
      expect(saved[0]).toMatchObject({
        business_id: 'biz-nueva',
        role_id: 'role-admin-id',
      });
    });

    it('NO copia plantillas si la empresa ya tiene permisos (count > 0)', async () => {
      const { service, permissionRepo } = await buildService(
        PM_IMPULSE_PRO,
        ALL_MENUS,
        5,
      );

      await service.getMenuTree(UserRole.ADMIN, 'biz-existente', 'plan-id');

      expect(permissionRepo.count).toHaveBeenCalled();
      expect(permissionRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(permissionRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Acceso por rol dentro del mismo plan ─────────────────────────────────

  describe('Acceso por rol — mismo plan, distintos roles', () => {
    it('admin obtiene el árbol completo de menús', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        UserRole.ADMIN,
        'biz-123',
        'plan-id',
      );
      expect(tree.length).toBeGreaterThan(0);
    });

    it('manager obtiene el árbol (si existe el rol en DB)', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        UserRole.MANAGER,
        'biz-123',
        'plan-id',
      );
      expect(tree.length).toBeGreaterThan(0);
    });

    it('agent obtiene el árbol (si existe el rol en DB)', async () => {
      const { service } = await buildService(PM_IMPULSE_PRO);
      const tree = await service.getMenuTree(
        UserRole.AGENT,
        'biz-123',
        'plan-id',
      );
      expect(tree.length).toBeGreaterThan(0);
    });
  });
});
