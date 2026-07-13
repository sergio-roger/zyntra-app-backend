import { DataSource } from 'typeorm';
import { Role } from '../../modules/auth/entities/role.entity';
import { Menu } from '../../modules/auth/entities/menu.entity';
import { Permission } from '../../modules/auth/entities/permission.entity';
import { Seeder } from './seeder.interface';
import {
  ROLES_DATA,
  MENUS_DATA,
  ROLE_PERMISSIONS,
  ADMIN_MENUS,
  MANAGER_MENUS,
  AGENT_MENUS,
} from './data/rbac.data';

export class RbacSeeder implements Seeder {
  async run(ds: DataSource): Promise<void> {
    const roleRepo = ds.getRepository(Role);
    const menuRepo = ds.getRepository(Menu);
    const permRepo = ds.getRepository(Permission);

    // 1️⃣ Seed Roles
    console.log('\n🔐 [1/3] Seeding roles...');
    for (const r of ROLES_DATA) {
      const existing = await roleRepo.findOne({ where: { name: r.name } });
      if (!existing) {
        await roleRepo.save(roleRepo.create(r));
        console.log(`  ✅ Role created: ${r.name}`);
      }
    }

    // 2️⃣ Seed Menus (upsert: crea o actualiza parent_key/label/path)
    console.log('\n📋 [2/3] Seeding menus...');
    let menusCreated = 0;
    let menusUpdated = 0;
    for (const m of MENUS_DATA) {
      const existing = await menuRepo.findOne({ where: { key: m.key } });
      if (!existing) {
        await menuRepo.save(
          menuRepo.create({
            key: m.key,
            label: m.label,
            path: m.path,
            parentKey: m.parent_key,
            description: m.description,
          }),
        );
        console.log(`  ✅ Menu created: ${m.key}`);
        menusCreated++;
      } else {
        await menuRepo.update(
          { key: m.key },
          {
            label: m.label,
            path: m.path,
            parentKey: m.parent_key,
            description: m.description,
          },
        );
        console.log(`  🔄 Menu updated: ${m.key}`);
        menusUpdated++;
      }
    }
    console.log(
      `  ✅ ${menusCreated} created, ${menusUpdated} updated (${MENUS_DATA.length} total)`,
    );

    // 3️⃣ Seed Permissions
    console.log('\n🔑 [3/3] Seeding permissions...');
    let created = 0;
    let skipped = 0;

    for (const [roleName, menuKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await roleRepo.findOne({ where: { name: roleName } });
      if (!role) continue;

      for (const menuKey of menuKeys) {
        const menu = await menuRepo.findOne({ where: { key: menuKey } });
        if (!menu) continue;

        const existing = await permRepo.findOne({
          where: { roleId: role.id, menuId: menu.id },
        });

        if (!existing) {
          await permRepo.save(
            permRepo.create({
              businessId: null,
              roleId: role.id,
              menuId: menu.id,
            }),
          );
          created++;
        } else {
          skipped++;
        }
      }
    }

    console.log(
      `  ✅ ${created} permissions created, ${skipped} already existed`,
    );
    console.log(`\n  Summary:`);
    console.log(`  • ADMIN   → ${ADMIN_MENUS.length} menus`);
    console.log(`  • MANAGER → ${MANAGER_MENUS.length} menus`);
    console.log(`  • AGENT   → ${AGENT_MENUS.length} menus`);

    console.log('\n✨ RBAC seed finished!\n');
  }
}
