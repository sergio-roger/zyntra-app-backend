import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Role } from '../src/modules/auth/entities/role.entity';
import { Menu } from '../src/modules/auth/entities/menu.entity';
import { Permission } from '../src/modules/auth/entities/permission.entity';

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES_DATA = [
  { name: 'admin',   description: 'Control total del negocio' },
  { name: 'manager', description: 'Gestión operativa del equipo' },
  { name: 'agent',   description: 'Operaciones del día a día' },
];

// ─── Menus ────────────────────────────────────────────────────────────────────

const MENUS_DATA = [
  // Raíces
  { key: 'dashboard',           label: 'Dashboard',          path: '/dashboard',               parent_key: null },
  { key: 'crm',                 label: 'CRM',                path: '/crm',                     parent_key: null },
  { key: 'agents_ia',           label: 'Agentes IA',         path: '/agents',                  parent_key: null },
  { key: 'inbox',               label: 'Inbox',              path: '/inbox',                   parent_key: null },
  { key: 'funnels',             label: 'Embudos',            path: '/funnels',                 parent_key: null },
  { key: 'avatar',              label: 'Avatar',             path: '/avatar',                  parent_key: null },
  { key: 'analytics',           label: 'Analítica',          path: '/analytics',               parent_key: null },
  { key: 'billing',             label: 'Facturación',        path: '/billing',                 parent_key: null },
  { key: 'settings',            label: 'Ajustes',            path: '/settings',                parent_key: null },
  // CRM subitems
  { key: 'crm_contacts',        label: 'Contactos',          path: '/crm/contacts',            parent_key: 'crm' },
  { key: 'crm_leads',           label: 'Inbox Leads',        path: '/crm/leads',               parent_key: 'crm' },
  { key: 'crm_deals',           label: 'Negocios',           path: '/crm/deals',               parent_key: 'crm' },
  { key: 'crm_tags',            label: 'Etiquetas',          path: '/crm/tags',                parent_key: 'crm' },
  { key: 'crm_tasks',           label: 'Tareas',             path: '/crm/tasks',               parent_key: 'crm' },
  { key: 'crm_fields',          label: 'Campos',             path: '/crm/fields',              parent_key: 'crm' },
  { key: 'crm_segments',        label: 'Segmentos',          path: '/crm/segments',            parent_key: 'crm' },
  // Agentes IA subitems
  { key: 'agents_strategy',     label: 'Estrategia',         path: '/agents/strategy',         parent_key: 'agents_ia' },
  { key: 'agents_content',      label: 'Contenido',         path: '/agents/content',          parent_key: 'agents_ia' },
  { key: 'agents_analysis',     label: 'Análisis',           path: '/agents/analysis',         parent_key: 'agents_ia' },
  // Inbox subitems
  { key: 'inbox_conversations', label: 'Conversaciones',     path: '/inbox',                   parent_key: 'inbox' },
  { key: 'inbox_automations',   label: 'Respuestas rápidas', path: '/inbox/automations',       parent_key: 'inbox' },
  { key: 'inbox_channels',      label: 'Canales',            path: '/inbox/channels',          parent_key: 'inbox' },
  // Embudos subitems
  { key: 'funnels_dashboard',   label: 'Dashboard',          path: '/funnels/dashboard',       parent_key: 'funnels' },
  { key: 'funnels_builder',     label: 'Constructor',        path: '/funnels/builder',         parent_key: 'funnels' },
  { key: 'funnels_templates',   label: 'Plantillas',         path: '/funnels/templates',       parent_key: 'funnels' },
  { key: 'funnels_automations', label: 'Automatizaciones',   path: '/funnels/automations',     parent_key: 'funnels' },
  { key: 'funnels_leads',       label: 'Leads',              path: '/funnels/leads',           parent_key: 'funnels' },
  { key: 'funnels_analytics',   label: 'Analítica',          path: '/funnels/analytics',       parent_key: 'funnels' },
  // Avatar subitems
  { key: 'avatar_identity',     label: 'Identidad',          path: '/avatar/identity',         parent_key: 'avatar' },
  { key: 'avatar_knowledge',    label: 'Conocimiento',       path: '/avatar/knowledge',        parent_key: 'avatar' },
  { key: 'avatar_voice',        label: 'Voz',                path: '/avatar/voice',            parent_key: 'avatar' },
  { key: 'avatar_memory',       label: 'Memoria',            path: '/avatar/memory',           parent_key: 'avatar' },
  // Analytics subitems
  { key: 'analytics_general',   label: 'General',            path: '/analytics/general',       parent_key: 'analytics' },
  { key: 'analytics_convs',     label: 'Conversaciones',     path: '/analytics/conversations', parent_key: 'analytics' },
  { key: 'analytics_leads',     label: 'Leads',              path: '/analytics/leads',         parent_key: 'analytics' },
  { key: 'analytics_perf',      label: 'Rendimiento',        path: '/analytics/performance',   parent_key: 'analytics' },
  // Settings subitems
  { key: 'settings_users',      label: 'Usuarios',           path: '/settings/users',          parent_key: 'settings' },
  { key: 'settings_teams',      label: 'Equipo',             path: '/settings/teams',          parent_key: 'settings' },
  { key: 'settings_lifecycle',  label: 'Ciclo de vida',      path: '/settings/lifecycle',      parent_key: 'settings' },
  { key: 'settings_channels',   label: 'Canales',            path: '/settings/channels',       parent_key: 'settings' },
];

// ─── Permission sets by role ──────────────────────────────────────────────────

const ADMIN_MENUS = MENUS_DATA.map((m) => m.key);

const MANAGER_MENUS = MENUS_DATA
  .filter((m) => !['billing', 'settings_users'].includes(m.key))
  .map((m) => m.key);

const AGENT_MENUS = [
  'dashboard',
  'crm', 'crm_contacts', 'crm_leads', 'crm_deals', 'crm_tasks', 'crm_segments',
  'inbox', 'inbox_conversations',
  'funnels', 'funnels_leads',
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin:   ADMIN_MENUS,
  manager: MANAGER_MENUS,
  agent:   AGENT_MENUS,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  const roleRepo = ds.getRepository(Role);
  const menuRepo = ds.getRepository(Menu);
  const permRepo = ds.getRepository(Permission);

  // ── 1. Roles ──────────────────────────────────────────────────────────────

  console.log('\n🔐 [1/3] Seeding roles...');
  const roleMap: Record<string, Role> = {};

  for (const data of ROLES_DATA) {
    let role = await roleRepo.findOne({ where: { name: data.name } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create(data));
      console.log(`  ✅ Role created: ${data.name}`);
    } else {
      console.log(`  ℹ️  Role already exists: ${data.name}`);
    }
    roleMap[data.name] = role;
  }

  // ── 2. Menus (upsert by key) ───────────────────────────────────────────────

  console.log('\n📋 [2/3] Seeding menus...');
  const menuMap: Record<string, Menu> = {};

  for (const data of MENUS_DATA) {
    let menu = await menuRepo.findOne({ where: { key: data.key } });
    if (!menu) {
      menu = await menuRepo.save(menuRepo.create(data));
      console.log(`  ✅ Menu created: ${data.key}`);
    } else {
      // Update label/path in case they changed
      Object.assign(menu, { label: data.label, path: data.path, parent_key: data.parent_key });
      menu = await menuRepo.save(menu);
    }
    menuMap[data.key] = menu;
  }

  console.log(`  ✅ ${MENUS_DATA.length} menus processed`);

  // ── 3. Permissions ────────────────────────────────────────────────────────

  console.log('\n🔑 [3/3] Seeding permissions...');
  let created = 0;
  let skipped = 0;

  for (const [roleName, menuKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleName];
    for (const menuKey of menuKeys) {
      const menu = menuMap[menuKey];
      if (!menu) continue;

      const existing = await permRepo.findOne({
        where: { role_id: role.id, menu_id: menu.id },
      });

      if (!existing) {
        await permRepo.save(permRepo.create({ role_id: role.id, menu_id: menu.id }));
        created++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`  ✅ ${created} permissions created, ${skipped} already existed`);
  console.log(`\n  Summary:`);
  console.log(`  • ADMIN   → ${ADMIN_MENUS.length} menus`);
  console.log(`  • MANAGER → ${MANAGER_MENUS.length} menus`);
  console.log(`  • AGENT   → ${AGENT_MENUS.length} menus`);

  console.log('\n✨ RBAC seed finished!\n');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌ RBAC seed failed:', err);
  process.exit(1);
});
