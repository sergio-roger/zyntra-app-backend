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

    // 2️⃣ Seed Menus
    console.log('\n📋 [2/3] Seeding menus...');
    let menusProcessed = 0;
    for (const m of MENUS_DATA) {
      const existing = await menuRepo.findOne({ where: { key: m.key } });
      if (!existing) {
        await menuRepo.save(menuRepo.create(m));
        console.log(`  ✅ Menu created: ${m.key}`);
      }
      menusProcessed++;
    }
    console.log(`  ✅ ${menusProcessed} menus processed`);

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
          where: { role_id: role.id, menu_id: menu.id },
        });

        if (!existing) {
          await permRepo.save(
            permRepo.create({
              business_id: null,
              role_id: role.id,
              menu_id: menu.id,
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
