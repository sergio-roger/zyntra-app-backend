import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  Business,
  PlanStatus,
} from '../src/modules/auth/entities/business.entity';
import { PlanDescription } from '../src/modules/auth/entities/plan-description.entity';
import { BillingCycle, Plan } from '../src/modules/auth/entities/plan.entity';
import { Contact } from '../src/modules/crm/entities/contact.entity';
import { Tag } from '../src/modules/crm/entities/tag.entity';
import { CrmUser } from '../src/modules/crm/entities/user.entity';
import { ContactSource } from '../src/modules/crm/enums/contact-source.enum';
import { ContactStage } from '../src/modules/crm/enums/contact-stage.enum';
import { UserRole } from '../src/modules/crm/enums/user-role.enum';
import {
  LifecycleStage,
  LifecycleStageType,
} from '../src/modules/lifecycle/entities/lifecycle-stage.entity';

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS_DATA = [
  {
    name: 'BrandStart',
    price: 99,
    billing_cycle: BillingCycle.ONE_TIME,
    is_popular: false,
    contact_limit: 500,
    task_limit: 0,
    descriptions: [
      'Diagnóstico del modelo de negocio',
      'Creación y configuración de redes sociales (Facebook, Instagram, TikTok)',
      'Creación de logo (3 cambios)',
      'Configuración de WhatsApp Business (Incluido catálogo)',
      'Diseño visual (paleta de colores y tipografía)',
      'Bibliografías persuasivas optimizadas',
      'Guía de marca con IA',
    ],
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
      'Chat bot 24/7 automatizado con IA',
    ],
  },
  {
    name: 'Core Digital',
    price: 449,
    billing_cycle: BillingCycle.MONTHLY,
    is_popular: false,
    contact_limit: 999999,
    task_limit: 999999,
    descriptions: [
      'Plan BrandStart incluido',
      'Plan Impulse Pro incluido',
      'Asesoría quincenal',
      'Landing Page (página web)',
      'Seo (posicionamiento en buscadores)',
      'CRM (gestión de clientes)',
      'Agente de IA especializado',
    ],
  },
];

// ─── Businesses & admin users (one per plan) ──────────────────────────────────

const BUSINESSES_DATA = [
  {
    planName: 'BrandStart',
    business: {
      name: 'Zyntra BrandStart Demo',
      email: 'brandstart@demo.zyntra.com',
    },
    adminUser: {
      name: 'Admin BrandStart',
      email: 'admin@brandstart.demo',
      role: UserRole.ADMIN,
    },
    contacts: [
      {
        name: 'María García',
        email: 'maria.garcia@example.com',
        phone: '+593991001001',
        stage: ContactStage.LEAD,
        source: ContactSource.MANUAL,
        company_name: 'García Designs',
        deal_value: 150,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Carlos López',
        email: 'carlos.lopez@example.com',
        phone: '+593991001002',
        stage: ContactStage.PROSPECT,
        source: ContactSource.WHATSAPP,
        company_name: 'López & Co',
        deal_value: 99,
        lifecycleName: 'Hot Lead',
      },
      {
        name: 'Ana Martínez',
        email: 'ana.martinez@example.com',
        phone: '+593991001003',
        stage: ContactStage.QUALIFIED,
        source: ContactSource.INSTAGRAM,
        company_name: null,
        deal_value: 99,
        lifecycleName: 'Payment',
      },
      {
        name: 'Pedro Sánchez',
        email: 'pedro.sanchez@example.com',
        phone: '+593991001004',
        stage: ContactStage.CUSTOMER,
        source: ContactSource.FORM,
        company_name: 'Sánchez Studio',
        deal_value: 99,
        lifecycleName: 'Customer',
      },
      {
        name: 'Laura Torres',
        email: 'laura.torres@example.com',
        phone: '+593991001005',
        stage: ContactStage.LOST,
        source: ContactSource.CHATBOT,
        company_name: null,
        deal_value: 0,
        lifecycleName: 'Cold Lead',
      },
      {
        name: 'Miguel Rodríguez',
        email: 'miguel.rodriguez@example.com',
        phone: '+593991001006',
        stage: ContactStage.LEAD,
        source: ContactSource.EMAIL,
        company_name: 'Rod Media',
        deal_value: 99,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Sofía Herrera',
        email: 'sofia.herrera@example.com',
        phone: '+593991001007',
        stage: ContactStage.PROSPECT,
        source: ContactSource.MANUAL,
        company_name: null,
        deal_value: 99,
        lifecycleName: 'Hot Lead',
      },
      {
        name: 'Diego Vargas',
        email: 'diego.vargas@example.com',
        phone: '+593991001008',
        stage: ContactStage.QUALIFIED,
        source: ContactSource.WHATSAPP,
        company_name: 'Vargas Branding',
        deal_value: 99,
        lifecycleName: 'Payment',
      },
    ],
  },
  {
    planName: 'Impulse Pro',
    business: {
      name: 'Zyntra Impulse Pro Demo',
      email: 'impulsepro@demo.zyntra.com',
    },
    adminUser: {
      name: 'Admin Impulse Pro',
      email: 'admin@impulsepro.demo',
      role: UserRole.ADMIN,
    },
    contacts: [
      {
        name: 'Isabella Morales',
        email: 'isabella.morales@example.com',
        phone: '+593992002001',
        stage: ContactStage.LEAD,
        source: ContactSource.INSTAGRAM,
        company_name: 'Morales Store',
        deal_value: 199,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Andrés Castro',
        email: 'andres.castro@example.com',
        phone: '+593992002002',
        stage: ContactStage.PROSPECT,
        source: ContactSource.MANUAL,
        company_name: 'Castro Digital',
        deal_value: 199,
        lifecycleName: 'Hot Lead',
      },
      {
        name: 'Valentina Reyes',
        email: 'valentina.reyes@example.com',
        phone: '+593992002003',
        stage: ContactStage.CUSTOMER,
        source: ContactSource.FORM,
        company_name: null,
        deal_value: 199,
        lifecycleName: 'Customer',
      },
      {
        name: 'Sebastián Flores',
        email: 'sebastian.flores@example.com',
        phone: '+593992002004',
        stage: ContactStage.QUALIFIED,
        source: ContactSource.WHATSAPP,
        company_name: 'Flores Ads',
        deal_value: 199,
        lifecycleName: 'Payment',
      },
      {
        name: 'Camila Jiménez',
        email: 'camila.jimenez@example.com',
        phone: '+593992002005',
        stage: ContactStage.LOST,
        source: ContactSource.CHATBOT,
        company_name: null,
        deal_value: 0,
        lifecycleName: 'Cold Lead',
      },
      {
        name: 'Mateo Ruiz',
        email: 'mateo.ruiz@example.com',
        phone: '+593992002006',
        stage: ContactStage.LEAD,
        source: ContactSource.EMAIL,
        company_name: 'Ruiz Marketing',
        deal_value: 199,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Lucía Mendoza',
        email: 'lucia.mendoza@example.com',
        phone: '+593992002007',
        stage: ContactStage.PROSPECT,
        source: ContactSource.INSTAGRAM,
        company_name: null,
        deal_value: 199,
        lifecycleName: 'Hot Lead',
      },
      {
        name: 'Felipe Ortiz',
        email: 'felipe.ortiz@example.com',
        phone: '+593992002008',
        stage: ContactStage.CUSTOMER,
        source: ContactSource.MANUAL,
        company_name: 'Ortiz Media',
        deal_value: 199,
        lifecycleName: 'Customer',
      },
    ],
  },
  {
    planName: 'Core Digital',
    business: {
      name: 'Zyntra Core Digital Demo',
      email: 'coredigital@demo.zyntra.com',
    },
    adminUser: {
      name: 'Admin Core Digital',
      email: 'admin@coredigital.demo',
      role: UserRole.ADMIN,
    },
    contacts: [
      {
        name: 'Mariana Silva',
        email: 'mariana.silva@example.com',
        phone: '+593993003001',
        stage: ContactStage.LEAD,
        source: ContactSource.CHATBOT,
        company_name: 'Silva Agency',
        deal_value: 449,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Roberto Díaz',
        email: 'roberto.diaz@example.com',
        phone: '+593993003002',
        stage: ContactStage.QUALIFIED,
        source: ContactSource.WHATSAPP,
        company_name: 'Díaz Corp',
        deal_value: 449,
        lifecycleName: 'Payment',
      },
      {
        name: 'Patricia Vega',
        email: 'patricia.vega@example.com',
        phone: '+593993003003',
        stage: ContactStage.CUSTOMER,
        source: ContactSource.FORM,
        company_name: 'Vega Solutions',
        deal_value: 449,
        lifecycleName: 'Customer',
      },
      {
        name: 'Alejandro Mora',
        email: 'alejandro.mora@example.com',
        phone: '+593993003004',
        stage: ContactStage.PROSPECT,
        source: ContactSource.MANUAL,
        company_name: null,
        deal_value: 449,
        lifecycleName: 'Hot Lead',
      },
      {
        name: 'Carolina Peña',
        email: 'carolina.pena@example.com',
        phone: '+593993003005',
        stage: ContactStage.LOST,
        source: ContactSource.EMAIL,
        company_name: null,
        deal_value: 0,
        lifecycleName: 'Cold Lead',
      },
      {
        name: 'Jorge Ramos',
        email: 'jorge.ramos@example.com',
        phone: '+593993003006',
        stage: ContactStage.CUSTOMER,
        source: ContactSource.INSTAGRAM,
        company_name: 'Ramos Digital',
        deal_value: 449,
        lifecycleName: 'Customer',
      },
      {
        name: 'Elena Santos',
        email: 'elena.santos@example.com',
        phone: '+593993003007',
        stage: ContactStage.LEAD,
        source: ContactSource.CHATBOT,
        company_name: null,
        deal_value: 449,
        lifecycleName: 'New Lead',
      },
      {
        name: 'Fernando Cruz',
        email: 'fernando.cruz@example.com',
        phone: '+593993003008',
        stage: ContactStage.QUALIFIED,
        source: ContactSource.WHATSAPP,
        company_name: 'Cruz SEO',
        deal_value: 449,
        lifecycleName: 'Payment',
      },
    ],
  },
];

// ─── Default lifecycle stages ─────────────────────────────────────────────────

const DEFAULT_LIFECYCLE_STAGES = [
  {
    name: 'New Lead',
    description: 'Contacto recién ingresado al sistema.',
    icon: '🆕',
    position: 0,
    type: LifecycleStageType.ACTIVE,
    is_default: true,
    is_won: false,
    is_system: true,
  },
  {
    name: 'Hot Lead',
    description: 'Contacto con alto interés demostrado.',
    icon: '🔥',
    position: 1,
    type: LifecycleStageType.ACTIVE,
    is_default: false,
    is_won: false,
    is_system: true,
  },
  {
    name: 'Payment',
    description: 'En proceso de pago o facturación.',
    icon: '💵',
    position: 2,
    type: LifecycleStageType.ACTIVE,
    is_default: false,
    is_won: false,
    is_system: true,
  },
  {
    name: 'Customer',
    description: 'Venta cerrada con éxito.',
    icon: '🏆',
    position: 3,
    type: LifecycleStageType.ACTIVE,
    is_default: false,
    is_won: true,
    is_system: true,
  },
  {
    name: 'Cold Lead',
    description: 'Contacto sin interés o perdido.',
    icon: '❄️',
    position: 4,
    type: LifecycleStageType.LOST,
    is_default: false,
    is_won: false,
    is_system: true,
  },
];

// ─── Default tags ─────────────────────────────────────────────────────────────

const DEFAULT_TAGS = [
  {
    name: 'VIP',
    color: '#f59e0b',
    description: 'Cliente o prospecto de alto valor',
  },
  { name: 'Frío', color: '#3b82f6', description: 'Sin interacción reciente' },
  { name: 'Caliente', color: '#ef4444', description: 'Listo para cerrar' },
  {
    name: 'Sin respuesta',
    color: '#6b7280',
    description: 'No ha respondido los últimos 7 días',
  },
  {
    name: 'Potencial',
    color: '#10b981',
    description: 'Buen fit pero aún en evaluación',
  },
];

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  const planRepo = ds.getRepository(Plan);
  const descRepo = ds.getRepository(PlanDescription);
  const businessRepo = ds.getRepository(Business);
  const userRepo = ds.getRepository(CrmUser);
  const stageRepo = ds.getRepository(LifecycleStage);
  const tagRepo = ds.getRepository(Tag);
  const contactRepo = ds.getRepository(Contact);

  const passwordHash = await bcrypt.hash('Zyntra2025!', 10);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── 1. Plans ──────────────────────────────────────────────────────────────

  console.log('\n🌱 [1/4] Seeding plans...');

  const planMap: Record<string, Plan> = {};

  for (const data of PLANS_DATA) {
    let plan = await planRepo.findOne({ where: { name: data.name } });

    if (!plan) {
      plan = await planRepo.save(
        planRepo.create({
          name: data.name,
          price: data.price,
          billing_cycle: data.billing_cycle,
          is_popular: data.is_popular,
          contact_limit: data.contact_limit,
          task_limit: data.task_limit,
        }),
      );

      const descriptions = data.descriptions.map((text, index) =>
        descRepo.create({
          plan_id: plan!.id,
          text,
          order: index,
          is_included: true,
        }),
      );
      await descRepo.save(descriptions);
      console.log(`  ✅ Plan created: ${data.name}`);
    } else {
      console.log(`  ℹ️  Plan already exists: ${data.name}`);
    }

    planMap[data.name] = plan;
  }

  // ── 2. Businesses + admin users ───────────────────────────────────────────

  console.log('\n🏢 [2/4] Seeding businesses and admin users...');

  for (const entry of BUSINESSES_DATA) {
    const plan = planMap[entry.planName];

    // Business
    let business = await businessRepo.findOne({
      where: { email: entry.business.email },
    });

    if (!business) {
      business = await businessRepo.save(
        businessRepo.create({
          name: entry.business.name,
          email: entry.business.email,
          password_hash: passwordHash,
          plan_id: plan.id,
          plan_status: PlanStatus.ACTIVE,
          trial_ends_at: trialEndsAt,
        }),
      );
      console.log(`  ✅ Business created: ${business.name}`);
    } else {
      console.log(`  ℹ️  Business already exists: ${business.name}`);
    }

    // Admin user
    const existingUser = await userRepo.findOne({
      where: { business_id: business.id, email: entry.adminUser.email },
    });

    if (!existingUser) {
      await userRepo.save(
        userRepo.create({
          business_id: business.id,
          plan_id: plan.id,
          name: entry.adminUser.name,
          email: entry.adminUser.email,
          password_hash: passwordHash,
          role: entry.adminUser.role,
          is_active: true,
        }),
      );
      console.log(`  ✅ Admin user created: ${entry.adminUser.email}`);
    } else {
      console.log(`  ℹ️  Admin user already exists: ${entry.adminUser.email}`);
    }
  }

  // ── 3. Lifecycle stages + tags per business ───────────────────────────────

  console.log('\n📋 [3/4] Seeding lifecycle stages and tags...');

  for (const entry of BUSINESSES_DATA) {
    const business = await businessRepo.findOne({
      where: { email: entry.business.email },
    });
    if (!business) continue;

    // Lifecycle stages
    const existingStages = await stageRepo.find({
      where: { business_id: business.id },
    });

    if (existingStages.length === 0) {
      const stages = DEFAULT_LIFECYCLE_STAGES.map((s) =>
        stageRepo.create({ ...s, business_id: business.id }),
      );
      await stageRepo.save(stages);
      console.log(`  ✅ Lifecycle stages created for: ${business.name}`);
    } else {
      console.log(`  ℹ️  Lifecycle stages already exist for: ${business.name}`);
    }

    // Tags
    for (const tagData of DEFAULT_TAGS) {
      const existingTag = await tagRepo.findOne({
        where: { business_id: business.id, name: tagData.name },
      });

      if (!existingTag) {
        await tagRepo.save(
          tagRepo.create({
            business_id: business.id,
            name: tagData.name,
            color: tagData.color,
            description: tagData.description,
          }),
        );
      }
    }
    console.log(`  ✅ Tags seeded for: ${business.name}`);
  }

  // ── 4. Contacts ───────────────────────────────────────────────────────────

  console.log('\n👥 [4/4] Seeding contacts...');

  for (const entry of BUSINESSES_DATA) {
    const business = await businessRepo.findOne({
      where: { email: entry.business.email },
    });
    if (!business) continue;

    const stages = await stageRepo.find({
      where: { business_id: business.id },
    });
    const stageByName = Object.fromEntries(stages.map((s) => [s.name, s]));

    let created = 0;

    for (const contactData of entry.contacts) {
      const existing = await contactRepo.findOne({
        where: { business_id: business.id, email: contactData.email },
      });

      if (!existing) {
        const lifecycleStage = stageByName[contactData.lifecycleName];
        await contactRepo.save(
          contactRepo.create({
            business_id: business.id,
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            stage: contactData.stage,
            lifecycle_stage_id: lifecycleStage?.id ?? null,
            source: contactData.source,
            company_name: contactData.company_name,
            deal_value: contactData.deal_value,
          }),
        );
        created++;
      }
    }

    console.log(
      `  ✅ ${created} contact(s) created for: ${business.name}${created < entry.contacts.length ? ' (some skipped — already existed)' : ''}`,
    );
  }

  console.log('\n✨ Seed finished successfully!\n');
  console.log(
    '  📧 Business/Company login credentials (all plans use password: Zyntra2025!):',
  );
  for (const entry of BUSINESSES_DATA) {
    console.log(`     • ${entry.business.email} (Company)`);
    console.log(`     • ${entry.adminUser.email} (CRM Admin)`);
  }
  console.log('');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
