import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Plan, BillingCycle } from '../src/modules/auth/entities/plan.entity';
import { PlanDescription } from '../src/modules/auth/entities/plan-description.entity';
import { Business } from '../src/modules/auth/entities/business.entity';
import {
  PlanModule,
  ModuleAccessLevel,
} from '../src/modules/auth/entities/plan-module.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const planRepo = dataSource.getRepository(Plan);
  const descRepo = dataSource.getRepository(PlanDescription);
  const businessRepo = dataSource.getRepository(Business);
  const planModuleRepo = dataSource.getRepository(PlanModule);

  console.log('🌱 Starting Seed: Plans & Plan Modules...');

  // Define Plans and Modules access levels
  const plansData = [
    {
      name: 'BrandStart',
      price: 99,
      billing_cycle: BillingCycle.ONE_TIME,
      is_popular: false,
      contact_limit: 500,
      task_limit: 10,
      user_limit: 2,
      ai_agent_limit: 0,
      chatbot_limit: 0,
      funnel_limit: 0,
      channel_limit: 1,
      descriptions: [
        'Diagnóstico del modelo de negocio',
        'Creación y configuración de redes sociales (Facebook, Instagram, TikTok)',
        'Creación de logo (3 cambios)',
        'Configuración de WhatsApp Business (Incluido catálogo)',
        'Diseño visual (paleta de colores y tipografía)',
        'Bibliografías persuasivas optimizadas',
        'Guía de marca con IA',
      ],
      modules: {
        dashboard: ModuleAccessLevel.FULL,
        dashboard_home: ModuleAccessLevel.FULL,
        crm: ModuleAccessLevel.LOCKED,
        crm_contacts: ModuleAccessLevel.LOCKED,
        crm_leads: ModuleAccessLevel.LOCKED,
        crm_deals: ModuleAccessLevel.LOCKED,
        crm_tags: ModuleAccessLevel.LOCKED,
        crm_tasks: ModuleAccessLevel.LOCKED,
        crm_fields: ModuleAccessLevel.LOCKED,
        crm_segments: ModuleAccessLevel.LOCKED,
        agents_ia: ModuleAccessLevel.LOCKED,
        inbox: ModuleAccessLevel.LOCKED,
        funnels: ModuleAccessLevel.LOCKED,
        avatar: ModuleAccessLevel.LOCKED,
        analytics: ModuleAccessLevel.LOCKED,
        billing: ModuleAccessLevel.FULL,
        settings: ModuleAccessLevel.READ_ONLY,
        settings_users: ModuleAccessLevel.LOCKED,
        settings_teams: ModuleAccessLevel.LOCKED,
        settings_lifecycle: ModuleAccessLevel.READ_ONLY,
        settings_channels: ModuleAccessLevel.LOCKED,
      },
    },
    {
      name: 'Impulse Pro',
      price: 199,
      billing_cycle: BillingCycle.MONTHLY,
      is_popular: true,
      contact_limit: 5000,
      task_limit: 200,
      user_limit: 5,
      ai_agent_limit: 1,
      chatbot_limit: 1,
      funnel_limit: 0,
      channel_limit: 3,
      descriptions: [
        'Calendario Editorial',
        'Creación de Contenido',
        'Optimización de Perfiles',
        'Gestión de Anuncios Meta',
        '9 Anuncios de Conversión',
        'Análisis mensual de campañas',
        'Chat bot 24/7 automatizado con IA',
      ],
      modules: {
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
      },
    },
    {
      name: 'Core Digital',
      price: 449,
      billing_cycle: BillingCycle.MONTHLY,
      is_popular: false,
      contact_limit: 999999,
      task_limit: 999999,
      user_limit: 999999,
      ai_agent_limit: 10,
      chatbot_limit: 5,
      funnel_limit: 999999,
      channel_limit: 999999,
      descriptions: [
        'Plan BrandStart incluido',
        'Plan Impulse Pro incluido',
        'Asesoría quincenal',
        'Landing Page (página web)',
        'Seo (posicionamiento en buscadores)',
        'CRM (gestión de clientes)',
        'Agente de IA especializado',
      ],
      modules: {
        dashboard: ModuleAccessLevel.FULL,
        crm: ModuleAccessLevel.FULL,
        agents_ia: ModuleAccessLevel.FULL,
        inbox: ModuleAccessLevel.FULL,
        funnels: ModuleAccessLevel.FULL,
        avatar: ModuleAccessLevel.FULL,
        analytics: ModuleAccessLevel.FULL,
        billing: ModuleAccessLevel.FULL,
        settings: ModuleAccessLevel.FULL,
      },
    },
  ];

  for (const data of plansData) {
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

  console.log('✨ Seed finished successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
