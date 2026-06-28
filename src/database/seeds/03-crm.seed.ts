import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import {
  Business,
  PlanStatus,
} from '../../modules/auth/entities/business.entity';
import { Plan } from '../../modules/auth/entities/plan.entity';
import { Company } from '../../modules/crm/entities/company.entity';
import { Contact } from '../../modules/crm/entities/contact.entity';
import { DealStageHistory } from '../../modules/crm/entities/deal-stage-history.entity';
import { Deal } from '../../modules/crm/entities/deal.entity';
import { PipelineStage } from '../../modules/crm/entities/pipeline-stage.entity';
import { Pipeline } from '../../modules/crm/entities/pipeline.entity';
import { Industry } from '../../modules/crm/entities/industry.entity';
import { Tag } from '../../modules/crm/entities/tag.entity';
import { CrmUser } from '../../modules/crm/entities/user.entity';
import { DealStatus } from '../../modules/crm/enums/deal-status.enum';
import { UserRole } from '../../modules/crm/enums/user-role.enum';
import { CustomFieldType } from '../../modules/crm/enums/custom-field-type.enum';
import { CustomField } from '../../modules/crm/entities/custom-field.entity';
import { Team } from '../../modules/crm/entities/team.entity';
import { CrmTask } from '../../modules/crm/entities/task.entity';
import { TaskStatus } from '../../modules/crm/enums/task-status.enum';
import { TaskPriority } from '../../modules/crm/enums/task-priority.enum';
import { LifecycleStage } from '../../modules/lifecycle/entities/lifecycle-stage.entity';
import {
  BUSINESSES_DATA,
  DEFAULT_EMPRESAS,
  DEFAULT_LIFECYCLE_STAGES,
  DEFAULT_PIPELINES,
  DEFAULT_INDUSTRIES,
  DEFAULT_TAGS,
} from './data/crm.data';
import { Seeder } from './seeder.interface';

export class CrmSeeder implements Seeder {
  async run(ds: DataSource): Promise<void> {
    const planRepo = ds.getRepository(Plan);
    const businessRepo = ds.getRepository(Business);
    const userRepo = ds.getRepository(CrmUser);
    const stageRepo = ds.getRepository(LifecycleStage);
    const tagRepo = ds.getRepository(Tag);
    const contactRepo = ds.getRepository(Contact);
    const pipelineRepo = ds.getRepository(Pipeline);
    const pipelineStageRepo = ds.getRepository(PipelineStage);
    const dealRepo = ds.getRepository(Deal);
    const historyRepo = ds.getRepository(DealStageHistory);
    const industryRepo = ds.getRepository(Industry);
    const companyRepo = ds.getRepository(Company);
    const customFieldRepo = ds.getRepository(CustomField);
    const teamRepo = ds.getRepository(Team);
    const taskRepo = ds.getRepository(CrmTask);

    const passwordHash = await argon2.hash('Zyntra2025!', {
      secret: Buffer.from(
        process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
      ),
    });

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // ── 1. Businesses + admin users ──────────────────────────────────────────

    console.log('\n👥 [1/5] Seeding businesses and admin users...');

    const agentUserMap: Record<string, CrmUser> = {};

    for (const entry of BUSINESSES_DATA) {
      const plan = await planRepo.findOne({ where: { name: entry.planName } });
      if (!plan) throw new Error(`Plan ${entry.planName} not found`);

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
        console.log(`  �o. Business created: ${business.name}`);
      } else {
        console.log(`  �"�️  Business already exists: ${business.name}`);
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
        console.log(`  �o. Admin user created: ${entry.adminUser.email}`);
      } else {
        console.log(
          `  �"�️  Admin user already exists: ${entry.adminUser.email}`,
        );
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
        console.log(`  �o. Agent user created: ${entry.agentUser.email}`);
      } else {
        console.log(
          `  �"�️  Agent user already exists: ${entry.agentUser.email}`,
        );
      }

      agentUserMap[entry.business.email] = agentUser;
    }

    // "?"? 2.1. Superadmin Business + Super Admin User "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
    console.log('\n✅ [2.1] Seeding global superadmin business and user...');
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
      console.log(`  �o. Superadmin Business created: ${superBusiness.name}`);
    } else {
      console.log(
        `  �"�️  Superadmin Business already exists: ${superBusiness.name}`,
      );
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
      console.log(`  �o. Super Admin user created: superuser@zyntra.com`);
    } else {
      console.log(
        `  �"�️  Super Admin user already exists: superuser@zyntra.com`,
      );
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

    // �"?�"? 3. Lifecycle stages + tags per business �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

    console.log('\n�Y"< [3/5] Seeding lifecycle stages and tags...');

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
        console.log(`  �o. Lifecycle stages created for: ${business.name}`);
      } else {
        console.log(
          `  �"�️  Lifecycle stages already exist for: ${business.name}`,
        );
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
              entity_type: tagData.entity_type,
            }),
          );
        }
      }
      console.log(`  o. Tags seeded for: ${business.name}`);
    }

    // 3.5. Industries + Empresas

    console.log('\n🏢 [3.5] Seeding industries and empresas...');

    for (const entry of BUSINESSES_DATA) {
      const business = await businessRepo.findOne({
        where: { email: entry.business.email },
      });
      if (!business) continue;
      console.log(`\n  --- 3. Seeding Industries for: ${business.name} ---`);
      const industryMap: Record<string, Industry> = {};
      for (const industryData of DEFAULT_INDUSTRIES) {
        let industry = await industryRepo.findOne({
          where: { business_id: business.id, name: industryData.name },
        });
        if (!industry) {
          industry = await industryRepo.save(
            industryRepo.create({
              business_id: business.id,
              name: industryData.name,
              description: industryData.description,
              is_active: true,
            }),
          );
        }
        industryMap[industryData.name] = industry;
      }
      console.log(`  🏢 Industries seeded for: ${business.name}`);

      // Companies
      let companiesCreated = 0;
      for (const companyData of DEFAULT_EMPRESAS) {
        const existing = await companyRepo.findOne({
          where: { businessId: business.id, name: companyData.name },
        });
        if (existing) continue;

        const industry = industryMap[companyData.industryName] ?? null;
        await companyRepo.save(
          companyRepo.create({
            businessId: business.id,
            name: companyData.name,
            identification: companyData.identificacion ?? null,
            taxType: companyData.tax_type ?? null,
            website: companyData.website ?? null,
            employeeRange: companyData.employee_range ?? null,
            description: companyData.descripcion ?? null,
            industryId: industry?.id ?? null,
          }),
        );
        companiesCreated++;
      }
      if (companiesCreated > 0) {
        console.log(
          `  🔹 ${companiesCreated} company(ies) created for: ${business.name}`,
        );
      } else {
        console.log(`  ✅ Companies already exist for: ${business.name}`);
      }
    }

    console.log('\n✅ [4/5] Seeding contacts...');

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

      // 1. Create Extra Users
      const extraUser1 = await userRepo.save(
        userRepo.create({
          business_id: business.id,
          name: 'Vendedor Especialista',
          email: `ventas1@${entry.business.email.split('@')[1]}`,
          password_hash: passwordHash,
          role: UserRole.AGENT,
          is_active: true,
        }),
      );
      const extraUser2 = await userRepo.save(
        userRepo.create({
          business_id: business.id,
          name: 'Soporte Nivel 1',
          email: `soporte1@${entry.business.email.split('@')[1]}`,
          password_hash: passwordHash,
          role: UserRole.AGENT,
          is_active: true,
        }),
      );

      const allBusinessUsers = [
        adminUser,
        agentUser,
        extraUser1,
        extraUser2,
      ].filter(Boolean) as CrmUser[];

      // 2. Create Teams
      const existingTeams = await teamRepo.find({
        where: { business_id: business.id },
      });
      if (existingTeams.length === 0) {
        await teamRepo.save(
          teamRepo.create({
            business_id: business.id,
            name: 'Ventas',
            description: 'Equipo de Ventas',
            color: '#10B981',
            members: [adminUser, agentUser, extraUser1].filter(
              Boolean,
            ) as CrmUser[],
          }),
        );
        await teamRepo.save(
          teamRepo.create({
            business_id: business.id,
            name: 'Soporte',
            description: 'Equipo de Soporte',
            color: '#3B82F6',
            members: [adminUser, extraUser2].filter(Boolean) as CrmUser[],
          }),
        );
        console.log(`  ✅ Teams and extra users created for: ${business.name}`);
      }

      // 3. Custom Fields
      const existingFields = await customFieldRepo.find({
        where: { business_id: business.id },
      });
      if (existingFields.length === 0) {
        await customFieldRepo.save(
          customFieldRepo.create([
            {
              business_id: business.id,
              name: 'industry',
              label: 'Industria',
              type: CustomFieldType.TEXT,
              is_active: true,
            },
            {
              business_id: business.id,
              name: 'budget',
              label: 'Presupuesto',
              type: CustomFieldType.NUMBER,
              is_active: true,
            },
            {
              business_id: business.id,
              name: 'lead_score',
              label: 'Puntuación de Lead',
              type: CustomFieldType.NUMBER,
              is_active: true,
            },
          ]),
        );
      }

      let created = 0;

      for (let i = 0; i < entry.contacts.length; i++) {
        const contactData = entry.contacts[i];
        const existing = await contactRepo.findOne({
          where: { businessId: business.id, email: contactData.email },
        });

        if (!existing) {
          const lifecycleStage = stageByName[contactData.lifecycleName];
          const owner = allBusinessUsers[i % allBusinessUsers.length];
          await contactRepo.save(
            contactRepo.create({
              businessId: business.id,
              name: contactData.name,
              email: contactData.email,
              phone: contactData.phone,
              lifecycleStageId: lifecycleStage?.id ?? null,
              source: contactData.source,
              dealValue: contactData.deal_value,
              ownerId: owner?.id ?? null,
              customFields: {
                industry: i % 2 === 0 ? 'Tecnología' : 'Salud',
                budget: (i + 1) * 1500,
                lead_score: Math.floor(Math.random() * 100),
              },
            }),
          );
          created++;
        }
      }

      console.log(
        `  �o. ${created} contact(s) created for: ${business.name}${created < entry.contacts.length ? ' (some skipped �?" already existed)' : ''}`,
      );
    }

    // �"?�"? 5. Pipelines + Stages + Deals �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

    console.log('\n�Y"? [5/5] Seeding pipelines, stages and deals...');

    const allBusinessEmails = BUSINESSES_DATA.map((e) => e.business.email);
    allBusinessEmails.push('superadmin@zyntra.com');

    for (const email of allBusinessEmails) {
      const business = await businessRepo.findOne({ where: { email } });
      if (!business) continue;

      const existingPipelines = await pipelineRepo.find({
        where: { business_id: business.id },
      });

      if (existingPipelines.length > 0) {
        console.log(`  �"�️  Pipelines already exist for: ${business.name}`);
        continue;
      }

      // Create pipelines + stages
      const pipelineMap: Record<
        string,
        { pipeline: Pipeline; stageMap: Record<string, PipelineStage> }
      > = {};

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

      console.log(`  �o. Pipelines + stages created for: ${business.name}`);

      // Seed sample deals tied to the default pipeline
      const defaultPipelineData = pipelineMap['Ventas Nuevas'];
      if (!defaultPipelineData) continue;

      const { pipeline: defaultPipeline, stageMap } = defaultPipelineData;
      const contacts = await contactRepo.find({
        where: { businessId: business.id },
      });

      if (contacts.length === 0) continue;

      const sampleDeals = [
        {
          title: 'Implementación Plan Premium',
          contactIdx: 0,
          stageName: 'Propuesta',
          value: 1500,
          daysOffset: 30,
        },
        {
          title: 'Campaña Social Media Q3',
          contactIdx: 1,
          stageName: 'Calificación',
          value: 800,
          daysOffset: 45,
        },
        {
          title: 'Renovación Anual',
          contactIdx: 2,
          stageName: 'Negociación',
          value: 2400,
          daysOffset: 15,
        },
        {
          title: 'Consultoría SEO',
          contactIdx: 3,
          stageName: 'Cierre',
          value: 600,
          daysOffset: 7,
        },
        {
          title: 'Landing Page Corporativa',
          contactIdx: 4 % contacts.length,
          stageName: 'Prospección',
          value: 1200,
          daysOffset: 60,
        },
      ];

      const companies = await companyRepo.find({
        where: { businessId: business.id },
      });
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
            contacts: [contact],
            company_id: dealsCreated % 2 === 0 ? companies[0]?.id : null, // randomly assign company if it exists
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
        console.log(
          `  o. ${dealsCreated} deal(s) created for: ${business.name}`,
        );
      }

      // Tasks Seed
      let tasksCreated = 0;
      const allDeals = await dealRepo.find({
        where: { business_id: business.id },
      });
      const admin = await userRepo.findOne({
        where: { business_id: business.id, email: 'admin@zyntra.com' },
      });
      const fallbackUser = await userRepo.findOne({
        where: { business_id: business.id },
      });
      const assignedUserId = admin
        ? admin.id
        : fallbackUser
          ? fallbackUser.id
          : null;

      for (let i = 0; i < allDeals.length; i++) {
        const d = allDeals[i];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (i + 2)); // Some days in the future

        await taskRepo.save(
          taskRepo.create({
            business_id: business.id,
            title: `Llamada de seguimiento - ${d.title}`,
            description: 'Verificar avances de la propuesta.',
            due_date: dueDate,
            status: i % 2 === 0 ? TaskStatus.PENDING : TaskStatus.COMPLETED,
            priority: i % 3 === 0 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
            deal_id: d.id,
            assigned_to: assignedUserId,
          }),
        );
        tasksCreated++;
      }
      if (tasksCreated > 0) {
        console.log(
          `  o. ${tasksCreated} task(s) created for: ${business.name}`,
        );
      }
    }

    console.log('\no Seed finished successfully!\n');
    console.log(
      '  Y" Business/Company login credentials (all plans use password: Zyntra2025!):',
    );
    for (const entry of BUSINESSES_DATA) {
      console.log(`     �?� ${entry.business.email} (Company)`);
      console.log(`     �?� ${entry.adminUser.email} (CRM Admin)`);
      console.log(`     �?� ${entry.agentUser.email} (CRM Agente)`);
    }
    console.log(`     �?� superadmin@zyntra.com (Company - Global Admin)`);
    console.log(`     �?� superuser@zyntra.com (Super Admin CRM)`);
    console.log('');
  }
}
