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

const argonOptions = {
  secret: Buffer.from(
    process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
  ),
};

interface BusinessResponseBody {
  data: Business;
}

describe('Settings → Business (e2e)', () => {
  let app: INestApplication<App>;
  let businessRepo: Repository<Business>;
  let userRepo: Repository<User>;
  let jwtSecret: string;

  const signToken = (payload: Record<string, unknown>) =>
    sign(payload, jwtSecret, { expiresIn: '1d' });

  let businessA: Business;
  let adminA: User;
  let tokenAdminA: string;

  let businessB: Business;
  let adminB: User;
  let tokenAdminB: string;

  let agentA: User;
  let tokenAgentA: string;

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
    jwtSecret = moduleFixture.get(ConfigService).get<string>('JWT_SECRET')!;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    businessA = await businessRepo.save(
      businessRepo.create({
        name: 'E2E Business A',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    adminA = await userRepo.save(
      userRepo.create({
        businessId: businessA.id,
        firstName: 'A',
        lastName: 'Admin',
        email: `business-a-admin-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash('Password1A', argonOptions),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isAccountActivated: true,
      }),
    );
    tokenAdminA = signToken({
      sub: adminA.id,
      email: adminA.email,
      plan: 'none',
      plan_status: businessA.planStatus,
      business_id: businessA.id,
      role: adminA.role,
    });

    agentA = await userRepo.save(
      userRepo.create({
        businessId: businessA.id,
        firstName: 'A',
        lastName: 'Agent',
        email: `business-a-agent-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash('Password1A', argonOptions),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        isAccountActivated: true,
      }),
    );
    tokenAgentA = signToken({
      sub: agentA.id,
      email: agentA.email,
      plan: 'none',
      plan_status: businessA.planStatus,
      business_id: businessA.id,
      role: agentA.role,
    });

    businessB = await businessRepo.save(
      businessRepo.create({
        name: 'E2E Business B',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    adminB = await userRepo.save(
      userRepo.create({
        businessId: businessB.id,
        firstName: 'B',
        lastName: 'Admin',
        email: `business-b-admin-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash('Password1B', argonOptions),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isAccountActivated: true,
      }),
    );
    tokenAdminB = signToken({
      sub: adminB.id,
      email: adminB.email,
      plan: 'none',
      plan_status: businessB.planStatus,
      business_id: businessB.id,
      role: adminB.role,
    });
  });

  afterAll(async () => {
    await userRepo.delete({ id: adminA.id });
    await userRepo.delete({ id: agentA.id });
    await userRepo.delete({ id: adminB.id });
    await businessRepo.delete({ id: businessA.id });
    await businessRepo.delete({ id: businessB.id });
    await app.close();
  });

  describe('GET /settings/business', () => {
    it('el admin de la business obtiene sus propios datos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .expect(200);

      const body = res.body as BusinessResponseBody;
      expect(body.data.id).toBe(businessA.id);
      expect(body.data.name).toBe('E2E Business A');
    });

    it('rechaza a un usuario que no es admin', async () => {
      await request(app.getHttpServer())
        .get('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .expect(403);
    });

    it('rechaza sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/settings/business')
        .expect(401);
    });
  });

  describe('PATCH /settings/business', () => {
    it('el admin actualiza los datos de su propia business', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'E2E Business A Updated',
          email: 'contact@business-a.test',
          taxId: '1791234567001',
          website: 'https://business-a.test',
        })
        .expect(200);

      const body = res.body as BusinessResponseBody;
      expect(body.data.name).toBe('E2E Business A Updated');
      expect(body.data.taxId).toBe('1791234567001');
      expect(body.data.website).toBe('https://business-a.test');

      const persisted = await businessRepo.findOneBy({ id: businessA.id });
      expect(persisted?.name).toBe('E2E Business A Updated');
    });

    it('no permite editar la business a un usuario que no es admin', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({ name: 'Intento no autorizado' })
        .expect(403);

      const persisted = await businessRepo.findOneBy({ id: businessA.id });
      expect(persisted?.name).not.toBe('Intento no autorizado');
    });

    it('un admin nunca puede editar la business de otro negocio, solo la propia', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({ name: 'Business B Renamed' })
        .expect(200);

      const businessAAfter = await businessRepo.findOneBy({ id: businessA.id });
      const businessBAfter = await businessRepo.findOneBy({ id: businessB.id });
      expect(businessAAfter?.name).not.toBe('Business B Renamed');
      expect(businessBAfter?.name).toBe('Business B Renamed');
    });

    it('rechaza un email inválido', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('rechaza un website que no es una URL válida', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ website: 'not-a-url' })
        .expect(400);
    });
  });
});
