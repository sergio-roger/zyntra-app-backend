import { DataSource } from 'typeorm';
import { Plan } from '../../modules/auth/entities/plan.entity';
import { PlanDescription } from '../../modules/auth/entities/plan-description.entity';
import { Business } from '../../modules/auth/entities/business.entity';
import { PlanModule } from '../../modules/auth/entities/plan-module.entity';
import { Seeder } from './seeder.interface';
import { PLANS_DATA } from './data/plans.data';

export class PlansSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const planRepo = dataSource.getRepository(Plan);
    const descRepo = dataSource.getRepository(PlanDescription);
    const businessRepo = dataSource.getRepository(Business);
    const planModuleRepo = dataSource.getRepository(PlanModule);

    console.log('🌱 Starting Seed: Plans & Plan Modules...');

    for (const data of PLANS_DATA) {
      let plan = await planRepo.findOne({ where: { name: data.name } });

      if (!plan) {
        plan = planRepo.create({
          name: data.name,
          price: data.price,
          billing_cycle: data.billing_cycle,
          is_popular: data.is_popular,
          contact_limit: data.contact_limit,
          task_limit: data.task_limit,
          user_limit: data.user_limit,
          ai_agent_limit: data.ai_agent_limit,
          chatbot_limit: data.chatbot_limit,
          funnel_limit: data.funnel_limit,
          channel_limit: data.channel_limit,
          pipeline_limit: data.pipeline_limit,
        });
        await planRepo.save(plan);
        console.log(`✅ Plan created: ${data.name}`);

        // Add descriptions
        const descriptions = data.descriptions.map((text, index) =>
          descRepo.create({
            plan_id: plan!.id,
            text,
            order: index,
            is_included: true,
          }),
        );
        await descRepo.save(descriptions);
      } else {
        // Update limits
        plan.price = data.price;
        plan.billing_cycle = data.billing_cycle;
        plan.is_popular = data.is_popular;
        plan.contact_limit = data.contact_limit;
        plan.task_limit = data.task_limit;
        plan.user_limit = data.user_limit;
        plan.ai_agent_limit = data.ai_agent_limit;
        plan.chatbot_limit = data.chatbot_limit;
        plan.funnel_limit = data.funnel_limit;
        plan.channel_limit = data.channel_limit;
        plan.pipeline_limit = data.pipeline_limit;
        await planRepo.save(plan);
        console.log(`ℹ️ Plan ${data.name} updated, syncing modules...`);
      }

      // Upsert modules defined in plan
      const definedKeys = Object.keys(data.modules);
      for (const key of definedKeys) {
        const accessLevel = data.modules[key as keyof typeof data.modules];
        if (!accessLevel) continue;

        let pm = await planModuleRepo.findOne({
          where: { plan_id: plan.id, menu_key: key },
        });

        if (pm) {
          if (pm.access_level !== accessLevel) {
            pm.access_level = accessLevel;
            await planModuleRepo.save(pm);
            console.log(`  Updated module ${key} -> ${accessLevel}`);
          }
        } else {
          pm = planModuleRepo.create({
            plan_id: plan.id,
            menu_key: key,
            access_level: accessLevel,
          });
          await planModuleRepo.save(pm);
          console.log(`  Created module ${key} -> ${accessLevel}`);
        }
      }

      // Delete any plan modules that are no longer defined (enabling inheritance)
      const existingPms = await planModuleRepo.find({
        where: { plan_id: plan.id },
      });
      for (const pm of existingPms) {
        if (!definedKeys.includes(pm.menu_key)) {
          await planModuleRepo.remove(pm);
          console.log(
            `  Deleted module ${pm.menu_key} (will inherit access level)`,
          );
        }
      }
    }

    // Migrate existing businesses (optional safety)
    const impulsePlan = await planRepo.findOne({
      where: { name: 'Impulse Pro' },
    });
    if (impulsePlan) {
      const businesses = await businessRepo.find();
      console.log(`🔄 Checking ${businesses.length} businesses for plan_id...`);
      for (const b of businesses) {
        if (!b.plan_id) {
          b.plan_id = impulsePlan.id;
          await businessRepo.save(b);
          console.log(`  Assigned ${b.name} to Impulse Pro`);
        }
      }
    }

    console.log('✨ Plans seed finished successfully!');
  }
}
