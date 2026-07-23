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
import { BusinessProfile } from './../src/modules/auth/entities/business-profile.entity';
import { PlanStatus } from './../src/modules/auth/enums/plan-status.enum';
import { BusinessModel } from './../src/modules/auth/enums/business-model.enum';
import { BrandTone } from './../src/modules/auth/enums/brand-tone.enum';
import { User } from './../src/modules/auth/entities/user.entity';
import { UserRole } from './../src/modules/crm/enums/user-role.enum';
import { UserStatus } from './../src/modules/crm/enums/user-status.enum';
import { Industry } from './../src/modules/crm/entities/industry.entity';

const argonOptions = {
  secret: Buffer.from(
    process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
  ),
};

interface BusinessProfileResponseBody {
  data: BusinessProfile;
}

describe('Settings → Business Profile (e2e)', () => {
  let app: INestApplication<App>;
  let businessRepo: Repository<Business>;
  let userRepo: Repository<User>;
  let profileRepo: Repository<BusinessProfile>;
  let industryRepo: Repository<Industry>;
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

  let industryA: Industry;

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
    profileRepo = moduleFixture.get(getRepositoryToken(BusinessProfile));
    industryRepo = moduleFixture.get(getRepositoryToken(Industry));
    jwtSecret = moduleFixture.get(ConfigService).get<string>('JWT_SECRET')!;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    businessA = await businessRepo.save(
      businessRepo.create({
        name: 'E2E Profile Business A',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    adminA = await userRepo.save(
      userRepo.create({
        businessId: businessA.id,
        firstName: 'A',
        lastName: 'Admin',
        email: `profile-a-admin-${Date.now()}@zyntra.test`,
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
        email: `profile-a-agent-${Date.now()}@zyntra.test`,
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
        name: 'E2E Profile Business B',
        planStatus: PlanStatus.TRIAL,
        trialEndsAt,
      }),
    );
    adminB = await userRepo.save(
      userRepo.create({
        businessId: businessB.id,
        firstName: 'B',
        lastName: 'Admin',
        email: `profile-b-admin-${Date.now()}@zyntra.test`,
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

    industryA = await industryRepo.save(
      industryRepo.create({
        businessId: businessA.id,
        name: `E2E Industry ${Date.now()}`,
      }),
    );
  });

  afterAll(async () => {
    await profileRepo.delete({ businessId: businessA.id });
    await profileRepo.delete({ businessId: businessB.id });
    await industryRepo.delete({ id: industryA.id });
    await userRepo.delete({ id: adminA.id });
    await userRepo.delete({ id: agentA.id });
    await userRepo.delete({ id: adminB.id });
    await businessRepo.delete({ id: businessA.id });
    await businessRepo.delete({ id: businessB.id });
    await app.close();
  });

  describe('GET /settings/business-profile', () => {
    it('el admin obtiene su perfil, auto-creado con defaults en el primer acceso', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .expect(200);

      const body = res.body as BusinessProfileResponseBody;
      expect(body.data.businessId).toBe(businessA.id);
      expect(body.data.businessModel).toBe(BusinessModel.B2C);
      expect(body.data.tone).toBe(BrandTone.FRIENDLY);
    });

    it('rechaza a un usuario que no es admin (todo el menú es admin-only)', async () => {
      await request(app.getHttpServer())
        .get('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .expect(403);
    });

    it('rechaza sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/settings/business-profile')
        .expect(401);
    });
  });

  describe('PATCH /settings/business-profile', () => {
    it('el admin actualiza campos de las distintas secciones', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          industryId: industryA.id,
          nicheDetail: 'SaaS para agencias',
          businessModel: BusinessModel.B2B,
          tone: BrandTone.PROFESSIONAL,
          competitors: ['Acme', 'Globex'],
          activeChannels: ['web_chat', 'facebook'],
          teamSize: 8,
          brandColors: { primary: '#6366f1', secondary: '#7c3aed' },
        })
        .expect(200);

      const body = res.body as BusinessProfileResponseBody;
      expect(body.data.industryId).toBe(industryA.id);
      expect(body.data.nicheDetail).toBe('SaaS para agencias');
      expect(body.data.businessModel).toBe(BusinessModel.B2B);
      expect(body.data.competitors).toEqual(['Acme', 'Globex']);
      expect(body.data.activeChannels).toEqual(['web_chat', 'facebook']);
      expect(body.data.teamSize).toBe(8);
    });

    it('no permite editar a un usuario que no es admin', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({ nicheDetail: 'Intento no autorizado' })
        .expect(403);
    });

    it('un admin nunca puede editar el perfil de otro negocio, solo el propio', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({ nicheDetail: 'Business B niche' })
        .expect(200);

      const profileA = await profileRepo.findOneBy({
        businessId: businessA.id,
      });
      const profileB = await profileRepo.findOneBy({
        businessId: businessB.id,
      });
      expect(profileA?.nicheDetail).not.toBe('Business B niche');
      expect(profileB?.nicheDetail).toBe('Business B niche');
    });

    it('rechaza un businessModel fuera del enum permitido', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ businessModel: 'not-a-model' })
        .expect(400);
    });

    it('rechaza un activeChannels con una key de canal inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ activeChannels: ['not-a-real-channel'] })
        .expect(400);
    });

    it('rechaza más de 10 competitors', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          competitors: Array.from({ length: 11 }, (_, i) => `Competitor ${i}`),
        })
        .expect(400);
    });

    it('rechaza un teamSize fuera de rango', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ teamSize: 0 })
        .expect(400);
    });

    it('rechaza un color de marca con formato inválido', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ brandColors: { primary: 'not-a-hex-color' } })
        .expect(400);
    });

    it('rechaza un industryId que no es un UUID válido', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/business-profile')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ industryId: 'not-a-uuid' })
        .expect(400);
    });
  });
});
