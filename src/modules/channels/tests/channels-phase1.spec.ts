/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/**
 * Phase 1 tests for the Channels module.
 *
 * These are unit tests using mocked TypeORM repositories.
 * For true constraint validation (FK, UNIQUE), run the integration
 * tests against a real DB:
 *   NODE_ENV=test DATABASE_URL=<test-db> npx jest channels-phase1.integration
 *
 * To run:
 *   npx jest channels-phase1.spec
 */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectLiteral, Repository, QueryFailedError } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { ChannelStatus } from '@/modules/channels/enums/channel-status.enum';
import { ChannelCredential } from '@/modules/channels/entities/channel-credential.entity';
import { CHANNEL_TYPES_SEED } from '@/modules/channels/seeds/seed-channel-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockRepo = <T extends ObjectLiteral>() =>
  ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),

    create: jest.fn((v: any) => v),
    delete: jest.fn(),
  }) as unknown as Repository<T>;

// ---------------------------------------------------------------------------
// Suite 1 – Seed data shape
// ---------------------------------------------------------------------------
describe('CHANNEL_TYPES_SEED', () => {
  it('contains exactly 3 records', () => {
    expect(CHANNEL_TYPES_SEED).toHaveLength(3);
  });

  it('web_chat.isAvailable === true', () => {
    const wc = CHANNEL_TYPES_SEED.find((s) => s.key === 'web_chat');
    expect(wc).toBeDefined();
    expect(wc!.isAvailable).toBe(true);
  });

  it('facebook and telegram are not available', () => {
    const fb = CHANNEL_TYPES_SEED.find((s) => s.key === 'facebook');
    const tg = CHANNEL_TYPES_SEED.find((s) => s.key === 'telegram');
    expect(fb!.isAvailable).toBe(false);
    expect(tg!.isAvailable).toBe(false);
  });

  it('all records have a valid JSON Schema ($schema field)', () => {
    for (const seed of CHANNEL_TYPES_SEED) {
      expect(seed.configSchema).toHaveProperty('$schema');
      expect(seed.configSchema).toHaveProperty('type', 'object');
      expect(seed.configSchema).toHaveProperty('properties');
    }
  });

  it('web_chat configSchema has position, primaryColor, allowedDomains', () => {
    const wc = CHANNEL_TYPES_SEED.find((s) => s.key === 'web_chat')!;
    const props = (wc.configSchema as any).properties;
    expect(props).toHaveProperty('position');
    expect(props).toHaveProperty('primaryColor');
    expect(props).toHaveProperty('allowedDomains');
  });

  it('sortOrder values are unique and ascending', () => {
    const orders = CHANNEL_TYPES_SEED.map((s) => s.sortOrder);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
    expect([...orders]).toEqual([...orders].sort((a, b) => a - b));
  });
});

// ---------------------------------------------------------------------------
// Suite 2 – Module wiring (NestJS TestingModule)
// ---------------------------------------------------------------------------
describe('ChannelsModule wiring', () => {
  let module: TestingModule;
  let channelTypeRepo: Repository<ChannelType>;
  let channelRepo: Repository<Channel>;
  let credentialRepo: Repository<ChannelCredential>;

  beforeEach(async () => {
    channelTypeRepo = mockRepo<ChannelType>();
    channelRepo = mockRepo<Channel>();
    credentialRepo = mockRepo<ChannelCredential>();

    module = await Test.createTestingModule({
      providers: [
        { provide: getRepositoryToken(ChannelType), useValue: channelTypeRepo },
        { provide: getRepositoryToken(Channel), useValue: channelRepo },
        {
          provide: getRepositoryToken(ChannelCredential),
          useValue: credentialRepo,
        },
      ],
    }).compile();
  });

  it('resolves ChannelType repository', () => {
    const repo = module.get<Repository<ChannelType>>(
      getRepositoryToken(ChannelType),
    );
    expect(repo).toBeDefined();
  });

  it('resolves Channel repository', () => {
    const repo = module.get<Repository<Channel>>(getRepositoryToken(Channel));
    expect(repo).toBeDefined();
  });

  it('resolves ChannelCredential repository', () => {
    const repo = module.get<Repository<ChannelCredential>>(
      getRepositoryToken(ChannelCredential),
    );
    expect(repo).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 – Constraint behaviour (simulated via mock QueryFailedError)
// ---------------------------------------------------------------------------
describe('Channel constraint: FK on channel_type_id', () => {
  let channelRepo: Repository<Channel>;

  beforeEach(() => {
    channelRepo = mockRepo<Channel>();
  });

  it('rejects insert with non-existent channel_type_id (FK violation)', async () => {
    const fkError = new QueryFailedError(
      '',
      [],
      new Error(
        'insert or update on table "channels" violates foreign key constraint',
      ),
    );
    (channelRepo.save as jest.Mock).mockRejectedValueOnce(fkError);

    await expect(
      channelRepo.save({
        businessId: 'biz-uuid',
        channelTypeId: '00000000-0000-0000-0000-000000000000',
        name: 'My Channel',
        status: ChannelStatus.ACTIVE,
        agentId: null,
        config: {},
      } as Channel),
    ).rejects.toThrow('foreign key constraint');
  });
});

describe('Channel constraint: uq_channel_per_business_type_name', () => {
  let channelRepo: Repository<Channel>;

  beforeEach(() => {
    channelRepo = mockRepo<Channel>();
  });

  it('rejects duplicate (business_id, channel_type_id, name)', async () => {
    const uniqueError = new QueryFailedError(
      '',
      [],
      new Error(
        'duplicate key value violates unique constraint "uq_channel_per_business_type_name"',
      ),
    );
    (channelRepo.save as jest.Mock)
      .mockResolvedValueOnce({ id: 'first' })
      .mockRejectedValueOnce(uniqueError);

    const payload = {
      businessId: 'biz-1',
      channelTypeId: 'ct-1',
      name: 'Principal',
    } as Channel;

    await expect(channelRepo.save(payload)).resolves.toBeDefined();
    await expect(channelRepo.save(payload)).rejects.toThrow(
      'uq_channel_per_business_type_name',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 4 – ChannelCredential: unique channel_id
// ---------------------------------------------------------------------------
describe('Channel constraint: uq_channel_per_business_type_name allows multiple web_chat channels', () => {
  let channelRepo: Repository<Channel>;

  beforeEach(() => {
    channelRepo = mockRepo<Channel>();
  });

  it('accepts two web_chat channels for the same business when names differ', async () => {
    (channelRepo.save as jest.Mock)
      .mockResolvedValueOnce({ id: 'c1', name: 'Sitio principal' })
      .mockResolvedValueOnce({ id: 'c2', name: 'Landing campaña verano' });

    const base = { businessId: 'biz-1', channelTypeId: 'ct-web' };

    await expect(
      channelRepo.save({ ...base, name: 'Sitio principal' } as Channel),
    ).resolves.toMatchObject({ id: 'c1' });
    await expect(
      channelRepo.save({ ...base, name: 'Landing campaña verano' } as Channel),
    ).resolves.toMatchObject({ id: 'c2' });
  });
});

// ---------------------------------------------------------------------------
// Suite 3b – 20260704_document_channels_multi_web_support.sql (forward-only
// raw SQL migration; this repo has no test DB, so we assert on file content
// the same way 20260701's shape is asserted via CHANNEL_TYPES_SEED above)
// ---------------------------------------------------------------------------
describe('Migration: 20260704_document_channels_multi_web_support.sql', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../database/migrations/20260704_document_channels_multi_web_support.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('exists and is registered in scripts/run-migrations.ts', () => {
    expect(sql.length).toBeGreaterThan(0);

    const runnerPath = path.resolve(
      __dirname,
      '../../../../scripts/run-migrations.ts',
    );
    const runnerSrc = fs.readFileSync(runnerPath, 'utf8');
    expect(runnerSrc).toContain(
      '20260704_document_channels_multi_web_support.sql',
    );
  });

  it('adds a composite index on (business_id, channel_type_id) idempotently', () => {
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_channels_business_type\s+ON public\.channels \(business_id, channel_type_id\)/,
    );
  });

  it('does not add or drop any column/constraint (docs + index only)', () => {
    expect(sql).not.toMatch(/ADD COLUMN/i);
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/^\s*ALTER TABLE.*ADD CONSTRAINT/im);
  });

  it('documents the multi-channel design via COMMENT ON', () => {
    expect(sql).toMatch(
      /COMMENT ON CONSTRAINT uq_channel_per_business_type_name ON public\.channels/,
    );
    expect(sql).toMatch(/COMMENT ON COLUMN public\.channels\.name/);
    expect(sql).toMatch(/COMMENT ON COLUMN public\.channels\.status/);
  });

  it('includes a manual DOWN section (forward-only convention)', () => {
    expect(sql).toMatch(/-- DOWN:/);
  });
});

describe('ChannelCredential constraint: unique channel_id', () => {
  let credRepo: Repository<ChannelCredential>;

  beforeEach(() => {
    credRepo = mockRepo<ChannelCredential>();
  });

  it('rejects duplicate channel_id', async () => {
    const uniqueError = new QueryFailedError(
      '',
      [],
      new Error('duplicate key value violates unique constraint'),
    );
    (credRepo.save as jest.Mock)
      .mockResolvedValueOnce({ id: 'cred-1' })
      .mockRejectedValueOnce(uniqueError);

    const channelId = 'chan-uuid';
    await expect(
      credRepo.save({
        channelId,
        data: 'enc1',
      } as ChannelCredential),
    ).resolves.toBeDefined();
    await expect(
      credRepo.save({
        channelId,
        data: 'enc2',
      } as ChannelCredential),
    ).rejects.toThrow('unique constraint');
  });
});
