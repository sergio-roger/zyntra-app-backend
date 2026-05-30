import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Plan, BillingCycle } from '../src/modules/auth/entities/plan.entity';
import { PlanDescription } from '../src/modules/auth/entities/plan-description.entity';
import { Business } from '../src/modules/auth/entities/business.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const planRepo = dataSource.getRepository(Plan);
  const descRepo = dataSource.getRepository(PlanDescription);
  const businessRepo = dataSource.getRepository(Business);

  console.log('🌱 Starting Seed: Plans...');

  // 1. Define Plans
  const plansData = [
    {
      name: 'BrandStart',
      price: 99,
      billing_cycle: BillingCycle.ONE_TIME,
      is_popular: false,
      contact_limit: 500, // Reasonable limit for start
      task_limit: 0,
      descriptions: [
        'Diagnóstico del modelo de negocio',
        'Creación y configuración de redes sociales (Facebook, Instagram, TikTok)',
        'Creación de logo (3 cambios)',
        'Configuración de WhatsApp Business (Incluido catálogo)',
        'Diseño visual (paleta de colores y tipografía)',
        'Bibliografías persuasivas optimizadas',
        'Guía de marca con IA'
      ]
    },
    {
      name: 'Impulse Pro',
      price: 199,
      billing_cycle: BillingCycle.MONTHLY,
      is_popular: true,
      contact_limit: 5000,
      task_limit: 200,
      descriptions: [
        'Calendario Editorial',
        'Creación de Contenido',
        'Optimización de Perfiles',
        'Gestión de Anuncios Meta',
        '9 Anuncios de Conversión',
        'Análisis mensual de campañas',
        'Chat bot 24/7 automatizado con IA'
      ]
    },
    {
      name: 'Core Digital',
      price: 449,
      billing_cycle: BillingCycle.MONTHLY,
      is_popular: false,
      contact_limit: 999999, // Unlimited
      task_limit: 999999, // Unlimited
      descriptions: [
        'Plan BrandStart incluido',
        'Plan Impulse Pro incluido',
        'Asesoría quincenal',
        'Landing Page (página web)',
        'Seo (posicionamiento en buscadores)',
        'CRM (gestión de clientes)',
        'Agente de IA especializado'
      ]
    }
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
      });
      await planRepo.save(plan);
      console.log(`✅ Plan created: ${data.name}`);

      // Add descriptions
      const descriptions = data.descriptions.map((text, index) => 
        descRepo.create({
          plan_id: plan!.id,
          text,
          order: index,
          is_included: true
        })
      );
      await descRepo.save(descriptions);
    } else {
      console.log(`ℹ️ Plan ${data.name} already exists, skipping...`);
    }
  }

  // 2. Migrate existing businesses (optional safety)
  const impulsePlan = await planRepo.findOne({ where: { name: 'Impulse Pro' } });
  if (impulsePlan) {
    const businesses = await businessRepo.find({ where: { plan_id: undefined } });
    if (businesses.length > 0) {
      console.log(`🔄 Migrating ${businesses.length} businesses to Impulse Pro...`);
      for (const b of businesses) {
        b.plan_id = impulsePlan.id;
      }
      await businessRepo.save(businesses);
    }
  }

  console.log('✨ Seed finished successfully!');
  await app.close();
}

bootstrap().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
