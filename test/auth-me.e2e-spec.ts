import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { promises as fs } from 'fs';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import {
  Business,
  PlanStatus,
} from './../src/modules/auth/entities/business.entity';
import { User as CrmUser } from './../src/modules/crm/entities/user.entity';
import { UserRole } from './../src/modules/crm/enums/user-role.enum';
import { UserStatus } from './../src/modules/crm/enums/user-status.enum';
import { Repository } from 'typeorm';

const argonOptions = {
  secret: Buffer.from(
    process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
  ),
};

describe('Self-service "My Account" (e2e)', () => {
  let app: INestApplication<App>;
  let businessRepo: Repository<Business>;
  let crmUserRepo: Repository<CrmUser>;
  let jwtService: JwtService;

  let owner: Business;
  let ownerToken: string;

  let victimBusiness: Business;
  let agent: CrmUser;
  let agentToken: string;

  const OWNER_OLD_PASSWORD = 'OldPassword1';
  const AGENT_OLD_PASSWORD = 'AgentPassword1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
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
    crmUserRepo = moduleFixture.get(getRepositoryToken(CrmUser));
    jwtService = moduleFixture.get(JwtService);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    owner = await businessRepo.save(
      businessRepo.create({
        name: 'E2E My Account Owner',
        email: `myaccount-owner-${Date.now()}@zyntra.test`,
        password_hash: await argon2.hash(OWNER_OLD_PASSWORD, argonOptions),
        plan_status: PlanStatus.TRIAL,
        trial_ends_at: trialEndsAt,
        firstName: 'Owner',
        lastName: 'Original',
        isAccountActivated: true,
      }),
    );
    ownerToken = jwtService.sign({
      sub: owner.id,
      email: owner.email,
      plan: 'none',
      plan_status: owner.plan_status,
      business_id: owner.id,
    });

    victimBusiness = await businessRepo.save(
      businessRepo.create({
        name: 'E2E My Account Victim',
        email: `myaccount-victim-${Date.now()}@zyntra.test`,
        password_hash: await argon2.hash('VictimPassword1', argonOptions),
        plan_status: PlanStatus.TRIAL,
        trial_ends_at: trialEndsAt,
        firstName: 'Victim',
        lastName: 'Untouched',
      }),
    );

    agent = await crmUserRepo.save(
      crmUserRepo.create({
        businessId: victimBusiness.id,
        firstName: 'Ana',
        lastName: 'Gomez',
        email: `myaccount-agent-${Date.now()}@zyntra.test`,
        passwordHash: await argon2.hash(AGENT_OLD_PASSWORD, argonOptions),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
      }),
    );
    agentToken = jwtService.sign({
      sub: victimBusiness.id,
      email: victimBusiness.email,
      plan: 'none',
      plan_status: victimBusiness.plan_status,
      business_id: victimBusiness.id,
      crm_user_id: agent.id,
      role: agent.role,
    });
  });

  afterAll(async () => {
    await businessRepo.delete({ id: owner.id });
    await businessRepo.delete({ id: victimBusiness.id });
    await fs
      .rm(process.cwd() + '/uploads/avatars', { recursive: true, force: true })
      .catch(() => undefined);
    await app.close();
  });

  describe('PATCH /auth/me', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .send({ firstName: 'Nope' })
        .expect(401);
    });

    it('updates the profile of the authenticated business and reflects the change', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ firstName: 'Updated', lastName: 'Name', jobTitle: 'CEO' })
        .expect(200);

      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Name');
      expect(res.body.data.jobTitle).toBe('CEO');
    });

    it('does not affect another business when an unrelated id is included in the payload', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ firstName: 'Attacker', businessId: victimBusiness.id })
        .expect(400);

      const untouchedVictim = await businessRepo.findOne({
        where: { id: victimBusiness.id },
      });
      expect(untouchedVictim?.firstName).toBe('Victim');
    });

    it('updates the CRM user profile scoped to the caller only', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ firstName: 'Ana Updated' })
        .expect(200);

      expect(res.body.data.firstName).toBe('Ana Updated');
      expect(res.body.data.crm_user_id).toBe(agent.id);

      const reloadedOwner = await businessRepo.findOne({
        where: { id: owner.id },
      });
      expect(reloadedOwner?.firstName).not.toBe('Ana Updated');
    });
  });

  describe('POST /auth/change-password', () => {
    it('rejects an incorrect current password and leaves the old password usable', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ currentPassword: 'WrongPassword1', newPassword: 'Whatever2Valid' })
        .expect(401);

      const stillOwner = await businessRepo.findOne({ where: { id: owner.id } });
      expect(
        await argon2.verify(
          stillOwner!.password_hash,
          OWNER_OLD_PASSWORD,
          argonOptions,
        ),
      ).toBe(true);
    });

    it('changes the password so the old one stops working and the new one works', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ currentPassword: OWNER_OLD_PASSWORD, newPassword: 'BrandNewPass1' })
        .expect(201);

      const updatedOwner = await businessRepo.findOne({ where: { id: owner.id } });
      expect(
        await argon2.verify(
          updatedOwner!.password_hash,
          OWNER_OLD_PASSWORD,
          argonOptions,
        ),
      ).toBe(false);
      expect(
        await argon2.verify(
          updatedOwner!.password_hash,
          'BrandNewPass1',
          argonOptions,
        ),
      ).toBe(true);
    });
  });

  describe('POST /auth/me/avatar', () => {
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    it('rejects a file with a disallowed MIME type', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/me/avatar')
        .set('Authorization', `Bearer ${agentToken}`)
        .attach('file', Buffer.from('not an image'), {
          filename: 'malicious.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('accepts a valid image and returns a non-null avatarUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/me/avatar')
        .set('Authorization', `Bearer ${agentToken}`)
        .attach('file', TINY_PNG, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(res.body.data.avatarUrl).toBeTruthy();

      const updatedAgent = await crmUserRepo.findOne({ where: { id: agent.id } });
      expect(updatedAgent?.avatarUrl).toBe(res.body.data.avatarUrl);
    });
  });
});
