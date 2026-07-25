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
          billingCycle: data.billing_cycle,
          isPopular: data.is_popular,
          contactLimit: data.contact_limit,
          taskLimit: data.task_limit,
          userLimit: data.user_limit,
          aiAgentLimit: data.ai_agent_limit,
          chatbotLimit: data.chatbot_limit,
          funnelLimit: data.funnel_limit,
          channelLimit: data.channel_limit,
          pipelineLimit: data.pipeline_limit,
          kbMaxDocumentsPerAgent: data.kb_max_documents_per_agent,
          kbMaxFileSizeMb: data.kb_max_file_size_mb,
          youtubeCompetitorLimit: data.youtube_competitor_limit,
        });
        await planRepo.save(plan);
        console.log(`✅ Plan created: ${data.name}`);

        // Add descriptions
        const descriptions = data.descriptions.map((text, index) =>
          descRepo.create({
            planId: plan!.id,
            text,
            order: index,
            isIncluded: true,
          }),
        );
        await descRepo.save(descriptions);
      } else {
        // Update limits
        plan.price = data.price;
        plan.billingCycle = data.billing_cycle;
        plan.isPopular = data.is_popular;
        plan.contactLimit = data.contact_limit;
        plan.taskLimit = data.task_limit;
        plan.userLimit = data.user_limit;
        plan.aiAgentLimit = data.ai_agent_limit;
        plan.chatbotLimit = data.chatbot_limit;
        plan.funnelLimit = data.funnel_limit;
        plan.channelLimit = data.channel_limit;
        plan.pipelineLimit = data.pipeline_limit;
        plan.kbMaxDocumentsPerAgent = data.kb_max_documents_per_agent;
        plan.kbMaxFileSizeMb = data.kb_max_file_size_mb;
        plan.youtubeCompetitorLimit = data.youtube_competitor_limit;
        await planRepo.save(plan);
        console.log(`ℹ️ Plan ${data.name} updated, syncing modules...`);
      }

      // Upsert modules defined in plan
      const definedKeys = Object.keys(data.modules);
      for (const key of definedKeys) {
        const accessLevel = data.modules[key as keyof typeof data.modules];
        if (!accessLevel) continue;

        let pm = await planModuleRepo.findOne({
          where: { planId: plan.id, menuKey: key },
        });

        if (pm) {
          if (pm.accessLevel !== accessLevel) {
            pm.accessLevel = accessLevel;
            await planModuleRepo.save(pm);
            console.log(`  Updated module ${key} -> ${accessLevel}`);
          }
        } else {
          pm = planModuleRepo.create({
            planId: plan.id,
            menuKey: key,
            accessLevel: accessLevel,
          });
          await planModuleRepo.save(pm);
          console.log(`  Created module ${key} -> ${accessLevel}`);
        }
      }

      // Delete any plan modules that are no longer defined (enabling inheritance)
      const existingPms = await planModuleRepo.find({
        where: { planId: plan.id },
      });
      for (const pm of existingPms) {
        if (!definedKeys.includes(pm.menuKey)) {
          await planModuleRepo.remove(pm);
          console.log(
            `  Deleted module ${pm.menuKey} (will inherit access level)`,
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
        if (!b.planId) {
          b.planId = impulsePlan.id;
          await businessRepo.save(b);
          console.log(`  Assigned ${b.name} to Impulse Pro`);
        }
      }
    }

    console.log('✨ Plans seed finished successfully!');
  }
}
