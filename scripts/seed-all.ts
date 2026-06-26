import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
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
import { Deal } from '../src/modules/crm/entities/deal.entity';
import { Pipeline } from '../src/modules/crm/entities/pipeline.entity';
import { PipelineStage } from '../src/modules/crm/entities/pipeline-stage.entity';
import { DealStageHistory } from '../src/modules/crm/entities/deal-stage-history.entity';
import { ContactSource } from '../src/modules/crm/enums/contact-source.enum';
import { ContactStage } from '../src/modules/crm/enums/contact-stage.enum';
import { UserRole } from '../src/modules/crm/enums/user-role.enum';
import { DealStatus } from '../src/modules/crm/enums/deal-status.enum';
import { PipelineStageType } from '../src/modules/crm/enums/pipeline-stage-type.enum';
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
  },
  {
    name: 'Core Digital',
    price: 449,
    billing_cycle: BillingCycle.MONTHLY,
    is_popular: false,
    contact_limit: 999999,
    task_limit: 999999,
    user_limit: 10,
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
    agentUser: {
      name: 'Agente BrandStart',
      email: 'agente@brandstart.demo',
      role: UserRole.AGENT,
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
    agentUser: {
      name: 'Agente Impulse Pro',
      email: 'agente@impulsepro.demo',
      role: UserRole.AGENT,
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
    agentUser: {
      name: 'Agente Core Digital',
      email: 'agente@coredigital.demo',
      role: UserRole.AGENT,
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

// ─── Default pipelines per business ──────────────────────────────────────────

const DEFAULT_PIPELINES = [
  {
    name: 'Ventas Nuevas',
    position: 0,
    is_default: true,
    stages: [
      { name: 'Prospección',   color: '#94a3b8', position: 0, type: PipelineStageType.ACTIVE, probability_percent: 10 },
      { name: 'Calificación',  color: '#60a5fa', position: 1, type: PipelineStageType.ACTIVE, probability_percent: 25 },
      { name: 'Propuesta',     color: '#f59e0b', position: 2, type: PipelineStageType.ACTIVE, probability_percent: 50 },
      { name: 'Negociación',   color: '#a78bfa', position: 3, type: PipelineStageType.ACTIVE, probability_percent: 75 },
      { name: 'Cierre',        color: '#34d399', position: 4, type: PipelineStageType.ACTIVE, probability_percent: 90 },
      { name: 'Ganado',        color: '#10b981', position: 5, type: PipelineStageType.WON,    probability_percent: 100 },
      { name: 'Perdido',       color: '#f87171', position: 6, type: PipelineStageType.LOST,   probability_percent: 0 },
    ],
  },
  {
    name: 'Renovaciones',
    position: 1,
    is_default: false,
    stages: [
      { name: 'Identificación', color: '#94a3b8', position: 0, type: PipelineStageType.ACTIVE, probability_percent: 30 },
      { name: 'Contacto',       color: '#60a5fa', position: 1, type: PipelineStageType.ACTIVE, probability_percent: 50 },
      { name: 'Renovado',       color: '#10b981', position: 2, type: PipelineStageType.WON,    probability_percent: 100 },
      { name: 'No renovado',    color: '#f87171', position: 3, type: PipelineStageType.LOST,   probability_percent: 0 },
    ],
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
  const pipelineRepo = ds.getRepository(Pipeline);
  const pipelineStageRepo = ds.getRepository(PipelineStage);
  const dealRepo = ds.getRepository(Deal);
  const historyRepo = ds.getRepository(DealStageHistory);

  const passwordHash = await argon2.hash('Zyntra2025!', {
    secret: Buffer.from(
      process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
    ),
  });

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── 1. Plans ──────────────────────────────────────────────────────────────

  console.log('\n🌱 [1/5] Seeding plans...');

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
          user_limit: data.user_limit,
          ai_agent_limit: data.ai_agent_limit,
          chatbot_limit: data.chatbot_limit,
          funnel_limit: data.funnel_limit,
          channel_limit: data.channel_limit,
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

  console.log('\n🏢 [2/5] Seeding businesses and admin users...');

  const agentUserMap: Record<string, CrmUser> = {};

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
    const existingAdmin = await userRepo.findOne({
      where: { business_id: business.id, email: entry.adminUser.email },
    });

    if (!existingAdmin) {
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

    // Agent user
    let agentUser = await userRepo.findOne({
      where: { business_id: business.id, email: entry.agentUser.email },
    });

    if (!agentUser) {
      agentUser = await userRepo.save(
        userRepo.create({
          business_id: business.id,
          plan_id: plan.id,
          name: entry.agentUser.name,
          email: entry.agentUser.email,
          password_hash: passwordHash,
          role: entry.agentUser.role,
          is_active: true,
        }),
      );
      console.log(`  ✅ Agent user created: ${entry.agentUser.email}`);
    } else {
      console.log(`  ℹ️  Agent user already exists: ${entry.agentUser.email}`);
    }

    agentUserMap[entry.business.email] = agentUser;
  }

  // ── 2.1. Superadmin Business + Super Admin User ───────────────────────────────
  console.log('\n👑 [2.1] Seeding global superadmin business and user...');
  let superBusiness = await businessRepo.findOne({
    where: { email: 'superadmin@zyntra.com' },
  });
  if (!superBusiness) {
    superBusiness = await businessRepo.save(
      businessRepo.create({
        name: 'Zyntra Global Admin',
        email: 'superadmin@zyntra.com',
        password_hash: passwordHash,
        plan_status: PlanStatus.ACTIVE,
        trial_ends_at: trialEndsAt,
      }),
    );
    console.log(`  ✅ Superadmin Business created: ${superBusiness.name}`);
  } else {
    console.log(`  ℹ️  Superadmin Business already exists: ${superBusiness.name}`);
  }

  if (!superBusiness) {
    throw new Error('Failed to seed or find superadmin business');
  }

  const existingSuperUser = await userRepo.findOne({
    where: { business_id: superBusiness.id, email: 'superuser@zyntra.com' },
  });
  if (!existingSuperUser) {
    await userRepo.save(
      userRepo.create({
        business_id: superBusiness.id,
        name: 'Super Admin',
        email: 'superuser@zyntra.com',
        password_hash: passwordHash,
        role: UserRole.SUPER_ADMIN,
        is_active: true,
      }),
    );
    console.log(`  ✅ Super Admin user created: superuser@zyntra.com`);
  } else {
    console.log(`  ℹ️  Super Admin user already exists: superuser@zyntra.com`);
  }

  // Seeding lifecycle stages & tags for superBusiness
  const existingSuperStages = await stageRepo.find({
    where: { business_id: superBusiness.id },
  });
  if (existingSuperStages.length === 0) {
    const stages = DEFAULT_LIFECYCLE_STAGES.map((s) =>
      stageRepo.create({ ...s, business_id: superBusiness.id }),
    );
    await stageRepo.save(stages);
  }
  for (const tagData of DEFAULT_TAGS) {
    const existingTag = await tagRepo.findOne({
      where: { business_id: superBusiness.id, name: tagData.name },
    });
    if (!existingTag) {
      await tagRepo.save(
        tagRepo.create({
          business_id: superBusiness.id,
          name: tagData.name,
          color: tagData.color,
          description: tagData.description,
        }),
      );
    }
  }

  // ── 3. Lifecycle stages + tags per business ───────────────────────────────

  console.log('\n📋 [3/5] Seeding lifecycle stages and tags...');

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

  console.log('\n👥 [4/5] Seeding contacts...');

  for (const entry of BUSINESSES_DATA) {
    const business = await businessRepo.findOne({
      where: { email: entry.business.email },
    });
    if (!business) continue;

    const stages = await stageRepo.find({
      where: { business_id: business.id },
    });
    const stageByName = Object.fromEntries(stages.map((s) => [s.name, s]));

    const adminUser = await userRepo.findOne({
      where: { business_id: business.id, email: entry.adminUser.email },
    });
    const agentUser = agentUserMap[entry.business.email] ?? null;

    let created = 0;

    for (let i = 0; i < entry.contacts.length; i++) {
      const contactData = entry.contacts[i];
      const existing = await contactRepo.findOne({
        where: { business_id: business.id, email: contactData.email },
      });

      if (!existing) {
        const lifecycleStage = stageByName[contactData.lifecycleName];
        // Distribute ownership: even index → admin, odd index → agent
        const owner = i % 2 === 0 ? adminUser : agentUser;
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
            owner_id: owner?.id ?? null,
          }),
        );
        created++;
      }
    }

    console.log(
      `  ✅ ${created} contact(s) created for: ${business.name}${created < entry.contacts.length ? ' (some skipped — already existed)' : ''}`,
    );
  }

  // ── 5. Pipelines + Stages + Deals ─────────────────────────────────────────

  console.log('\n🔀 [5/5] Seeding pipelines, stages and deals...');

  const allBusinessEmails = BUSINESSES_DATA.map((e) => e.business.email);
  allBusinessEmails.push('superadmin@zyntra.com');

  for (const email of allBusinessEmails) {
    const business = await businessRepo.findOne({ where: { email } });
    if (!business) continue;

    const existingPipelines = await pipelineRepo.find({
      where: { business_id: business.id },
    });

    if (existingPipelines.length > 0) {
      console.log(`  ℹ️  Pipelines already exist for: ${business.name}`);
      continue;
    }

    // Create pipelines + stages
    const pipelineMap: Record<string, { pipeline: Pipeline; stageMap: Record<string, PipelineStage> }> = {};

    for (const pipelineData of DEFAULT_PIPELINES) {
      const pipeline = await pipelineRepo.save(
        pipelineRepo.create({
          business_id: business.id,
          name: pipelineData.name,
          position: pipelineData.position,
          is_default: pipelineData.is_default,
        }),
      );

      const stageMap: Record<string, PipelineStage> = {};
      for (const stageData of pipelineData.stages) {
        const stage = await pipelineStageRepo.save(
          pipelineStageRepo.create({
            pipeline_id: pipeline.id,
            name: stageData.name,
            color: stageData.color,
            position: stageData.position,
            type: stageData.type,
            probability_percent: stageData.probability_percent,
          }),
        );
        stageMap[stageData.name] = stage;
      }

      pipelineMap[pipelineData.name] = { pipeline, stageMap };
    }

    console.log(`  ✅ Pipelines + stages created for: ${business.name}`);

    // Seed sample deals tied to the default pipeline
    const defaultPipelineData = pipelineMap['Ventas Nuevas'];
    if (!defaultPipelineData) continue;

    const { pipeline: defaultPipeline, stageMap } = defaultPipelineData;
    const contacts = await contactRepo.find({
      where: { business_id: business.id },
    });

    if (contacts.length === 0) continue;

    const sampleDeals = [
      { title: 'Implementación Plan Premium', contactIdx: 0, stageName: 'Propuesta',    value: 1500,  daysOffset: 30 },
      { title: 'Campaña Social Media Q3',     contactIdx: 1, stageName: 'Calificación', value: 800,   daysOffset: 45 },
      { title: 'Renovación Anual',            contactIdx: 2, stageName: 'Negociación',  value: 2400,  daysOffset: 15 },
      { title: 'Consultoría SEO',             contactIdx: 3, stageName: 'Cierre',       value: 600,   daysOffset: 7 },
      { title: 'Landing Page Corporativa',    contactIdx: 4 % contacts.length, stageName: 'Prospección', value: 1200, daysOffset: 60 },
    ];

    let dealsCreated = 0;
    for (const dealData of sampleDeals) {
      const contact = contacts[dealData.contactIdx];
      const stage = stageMap[dealData.stageName];
      if (!contact || !stage) continue;

      const existingDeal = await dealRepo.findOne({
        where: { business_id: business.id, title: dealData.title },
      });
      if (existingDeal) continue;

      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + dealData.daysOffset);

      const deal = await dealRepo.save(
        dealRepo.create({
          business_id: business.id,
          title: dealData.title,
          contact_id: contact.id,
          pipeline_id: defaultPipeline.id,
          stage_id: stage.id,
          value: dealData.value,
          currency: 'USD',
          status: DealStatus.OPEN,
          expected_close_date: closeDate,
          probability: stage.probability_percent,
        }),
      );

      await historyRepo.save(
        historyRepo.create({
          deal_id: deal.id,
          stage_id: stage.id,
          entered_at: new Date(),
        }),
      );

      dealsCreated++;
    }

    if (dealsCreated > 0) {
      console.log(`  ✅ ${dealsCreated} deal(s) created for: ${business.name}`);
    }
  }

  console.log('\n✨ Seed finished successfully!\n');
  console.log(
    '  📧 Business/Company login credentials (all plans use password: Zyntra2025!):',
  );
  for (const entry of BUSINESSES_DATA) {
    console.log(`     • ${entry.business.email} (Company)`);
    console.log(`     • ${entry.adminUser.email} (CRM Admin)`);
    console.log(`     • ${entry.agentUser.email} (CRM Agente)`);
  }
  console.log(`     • superadmin@zyntra.com (Company - Global Admin)`);
  console.log(`     • superuser@zyntra.com (Super Admin CRM)`);
  console.log('');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
