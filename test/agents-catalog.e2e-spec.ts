import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Business } from './../src/modules/auth/entities/business.entity';
import { PlanStatus } from './../src/modules/auth/enums/plan-status.enum';
import { User } from './../src/modules/auth/entities/user.entity';
import { UserRole } from './../src/modules/crm/enums/user-role.enum';
import { UserStatus } from './../src/modules/crm/enums/user-status.enum';
import { SystemAgent } from './../src/modules/agents/entities/system-agent.entity';
import { BusinessSystemAgent } from './../src/modules/agents/entities/business-system-agent.entity';

const argonOptions = {
  secret: Buffer.from(
    process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
  ),
};

describe('Agents Catalog → Importar → Equipo de Agentes (e2e)', () => {
  let app: INestApplication<App>;
  let businessRepo: Repository<Business>;
  let userRepo: Repository<User>;
  let systemAgentsRepo: Repository<SystemAgent>;
  let businessSystemAgentsRepo: Repository<BusinessSystemAgent>;
  let jwtSecret: string;

  const signToken = (payload: Record<string, unknown>) =>
    sign(payload, jwtSecret, { expiresIn: '1d' });

  let businessA: Business;
  let userA: User;
  let tokenA: string;

  let businessB: Business;
  let userB: User;
  let tokenB: string;

  let activeAgent: SystemAgent;
  let comingSoonAgent: SystemAgent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    businessRepo = moduleFixture.get(getRepositoryToken(Business));
    userRepo = moduleFixture.get(getRepositoryToken(User));
    systemAgentsRepo = moduleFixture.get(getRepositoryToken(SystemAgent));
    businessSystemAgentsRepo = moduleFixture.get(
      getRepositoryToken(BusinessSystemAgent),
    );
    jwtSecret = moduleFixture.get(ConfigService).get<string>('JWT_SECRET')!;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    activeAgent = await systemAgentsRepo.save(
      systemAgentsRepo.create({
        slug: `e2e-active-agent-${Date.now()}`,
        name: 'E2E Active Agent',
        role: 'e2e_active',
        status: 'active',
      }),
    );
    comingSoonAgent = await systemAgentsRepo.save(
      systemAgentsRepo.create({
        slug: `e2e-coming-soon-agent-${Date.now()}`,
        name: 'E2E Coming Soon Agent',
        role: 'e2e_coming_soon',
        status: 'coming_soon',
      }),
    );

    businessA = await businessRepo.save(
      businessRepo.create({
        name: 'E2E Agents Catalog Business A',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    userA = await userRepo.save(
      userRepo.create({
        businessId: businessA.id,
        firstName: 'A',
        lastName: 'Owner',
        email: `agents-catalog-a-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash('Password1A', argonOptions),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isAccountActivated: true,
      }),
    );
    tokenA = signToken({
      sub: userA.id,
      email: userA.email,
      plan: 'none',
      plan_status: businessA.planStatus,
      business_id: businessA.id,
      role: userA.role,
    });

    businessB = await businessRepo.save(
      businessRepo.create({
        name: 'E2E Agents Catalog Business B',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    userB = await userRepo.save(
      userRepo.create({
        businessId: businessB.id,
        firstName: 'B',
        lastName: 'Owner',
        email: `agents-catalog-b-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash('Password1B', argonOptions),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isAccountActivated: true,
      }),
    );
    tokenB = signToken({
      sub: userB.id,
      email: userB.email,
      plan: 'none',
      plan_status: businessB.planStatus,
      business_id: businessB.id,
      role: userB.role,
    });
  });

  afterAll(async () => {
    await businessSystemAgentsRepo.delete({ businessId: businessA.id });
    await businessSystemAgentsRepo.delete({ businessId: businessB.id });
    await userRepo.delete({ id: userA.id });
    await userRepo.delete({ id: userB.id });
    await businessRepo.delete({ id: businessA.id });
    await businessRepo.delete({ id: businessB.id });
    await systemAgentsRepo.delete({ id: activeAgent.id });
    await systemAgentsRepo.delete({ id: comingSoonAgent.id });
    await app.close();
  });

  describe('GET /agents-catalog', () => {
    it('devuelve el catálogo con la categoría embebida en cada agente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/agents-catalog')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(
        (a: SystemAgent) => a.id === activeAgent.id,
      );
      expect(found).toBeDefined();
      expect(found).toHaveProperty('category');
    });
  });

  describe('POST /businesses/:businessId/system-agents/:systemAgentId/import', () => {
    it('rechaza importar un agente coming_soon', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/businesses/${businessA.id}/system-agents/${comingSoonAgent.id}/import`,
        )
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      const imported = await businessSystemAgentsRepo.findOne({
        where: { businessId: businessA.id, systemAgentId: comingSoonAgent.id },
      });
      expect(imported).toBeNull();
    });

    it('importa un agente active y lo refleja en el equipo del negocio', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/businesses/${businessA.id}/system-agents/${activeAgent.id}/import`,
        )
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/businesses/${businessA.id}/system-agents`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(
        res.body.data.some(
          (row: BusinessSystemAgent) => row.systemAgentId === activeAgent.id,
        ),
      ).toBe(true);
    });

    it('es idempotente: importar dos veces no duplica la fila', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/businesses/${businessA.id}/system-agents/${activeAgent.id}/import`,
        )
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(201);

      const rows = await businessSystemAgentsRepo.find({
        where: { businessId: businessA.id, systemAgentId: activeAgent.id },
      });
      expect(rows).toHaveLength(1);
    });

    it('aísla el equipo de agentes por negocio: businessB no ve lo importado por businessA', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/businesses/${businessB.id}/system-agents`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(
        res.body.data.some(
          (row: BusinessSystemAgent) => row.systemAgentId === activeAgent.id,
        ),
      ).toBe(false);
    });

    it('rechaza el acceso cruzado entre negocios', async () => {
      await request(app.getHttpServer())
        .get(`/api/businesses/${businessA.id}/system-agents`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });
  });
});
