import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Plan } from '../src/modules/auth/entities/plan.entity';
import {
  PlanModule,
  ModuleAccessLevel,
} from '../src/modules/auth/entities/plan-module.entity';

const MODULE_MATRIX: Record<string, Record<string, ModuleAccessLevel>> = {
  BrandStart: {
    dashboard: ModuleAccessLevel.FULL,
    dashboard_home: ModuleAccessLevel.FULL,
    crm: ModuleAccessLevel.READ_ONLY,
    crm_contacts: ModuleAccessLevel.READ_ONLY,
    crm_leads: ModuleAccessLevel.LOCKED,
    crm_deals: ModuleAccessLevel.LOCKED,
    crm_tags: ModuleAccessLevel.READ_ONLY,
    crm_tasks: ModuleAccessLevel.READ_ONLY,
    crm_fields: ModuleAccessLevel.LOCKED,
    crm_segments: ModuleAccessLevel.LOCKED,
    agents_ia: ModuleAccessLevel.LOCKED,
    inbox: ModuleAccessLevel.LOCKED,
    funnels: ModuleAccessLevel.LOCKED,
    avatar: ModuleAccessLevel.LOCKED,
    analytics: ModuleAccessLevel.LOCKED,
    billing: ModuleAccessLevel.FULL,
    settings: ModuleAccessLevel.READ_ONLY,
    settings_config: ModuleAccessLevel.READ_ONLY,
    settings_my_account: ModuleAccessLevel.READ_ONLY,
    settings_users: ModuleAccessLevel.LOCKED,
    settings_teams: ModuleAccessLevel.LOCKED,
    settings_lifecycle: ModuleAccessLevel.READ_ONLY,
    settings_channels: ModuleAccessLevel.LOCKED,
  },
  'Impulse Pro': {
    dashboard: ModuleAccessLevel.FULL,
    dashboard_home: ModuleAccessLevel.FULL,
    crm: ModuleAccessLevel.FULL,
    agents_ia: ModuleAccessLevel.FULL,
    inbox: ModuleAccessLevel.FULL,
    inbox_channels: ModuleAccessLevel.READ_ONLY,
    funnels: ModuleAccessLevel.READ_ONLY,
    funnels_dashboard: ModuleAccessLevel.FULL,
    funnels_builder: ModuleAccessLevel.LOCKED,
    funnels_templates: ModuleAccessLevel.READ_ONLY,
    funnels_automations: ModuleAccessLevel.LOCKED,
    funnels_leads: ModuleAccessLevel.FULL,
    funnels_analytics: ModuleAccessLevel.FULL,
    avatar: ModuleAccessLevel.FULL,
    avatar_voice: ModuleAccessLevel.READ_ONLY,
    avatar_memory: ModuleAccessLevel.READ_ONLY,
    analytics: ModuleAccessLevel.FULL,
    billing: ModuleAccessLevel.FULL,
    settings: ModuleAccessLevel.FULL,
    settings_config: ModuleAccessLevel.FULL,
    settings_my_account: ModuleAccessLevel.FULL,
  },
  'Core Digital': {
    dashboard: ModuleAccessLevel.FULL,
    crm: ModuleAccessLevel.FULL,
    agents_ia: ModuleAccessLevel.FULL,
    inbox: ModuleAccessLevel.FULL,
    funnels: ModuleAccessLevel.FULL,
    avatar: ModuleAccessLevel.FULL,
    analytics: ModuleAccessLevel.FULL,
    billing: ModuleAccessLevel.FULL,
    settings: ModuleAccessLevel.FULL,
    settings_config: ModuleAccessLevel.FULL,
    settings_my_account: ModuleAccessLevel.FULL,
  },
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const planRepo = dataSource.getRepository(Plan);
  const planModuleRepo = dataSource.getRepository(PlanModule);

  console.log('🌱 Starting Sync: Plan Modules Matrix...');

  const plans = await planRepo.find();

  for (const plan of plans) {
    const planMatrix = MODULE_MATRIX[plan.name];
    if (!planMatrix) {
      console.log(
        `⚠️ Plan ${plan.name} has no module matrix mapping defined. Skipping...`,
      );
      continue;
    }

    console.log(`ℹ️ Syncing modules for Plan: ${plan.name}`);

    const definedKeys = Object.keys(planMatrix);
    for (const key of definedKeys) {
      const targetLevel = planMatrix[key];
      let pm = await planModuleRepo.findOne({
        where: { plan_id: plan.id, menu_key: key },
      });

      if (pm) {
        if (pm.access_level !== targetLevel) {
          pm.access_level = targetLevel;
          await planModuleRepo.save(pm);
          console.log(`  Updated ${key} -> ${targetLevel}`);
        }
      } else {
        pm = planModuleRepo.create({
          plan_id: plan.id,
          menu_key: key,
          access_level: targetLevel,
        });
        await planModuleRepo.save(pm);
        console.log(`  Created ${key} -> ${targetLevel}`);
      }
    }

    // Delete other keys to allow inheritance
    const existingPms = await planModuleRepo.find({
      where: { plan_id: plan.id },
    });
    for (const pm of existingPms) {
      if (!definedKeys.includes(pm.menu_key)) {
        await planModuleRepo.remove(pm);
        console.log(`  Deleted ${pm.menu_key} (will inherit access level)`);
      }
    }
  }

  console.log('✨ Plan modules synchronization finished successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
