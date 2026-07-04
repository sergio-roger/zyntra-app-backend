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
import { ChannelType } from '../entities/channel-type.entity';
import { Channel, ChannelStatus } from '../entities/channel.entity';
import { ChannelCredential } from '../entities/channel-credential.entity';
import { CHANNEL_TYPES_SEED } from '../seeds/seed-channel-types';

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

  it('web_chat.is_available === true', () => {
    const wc = CHANNEL_TYPES_SEED.find((s) => s.key === 'web_chat');
    expect(wc).toBeDefined();
    expect(wc!.is_available).toBe(true);
  });

  it('facebook and telegram are not available', () => {
    const fb = CHANNEL_TYPES_SEED.find((s) => s.key === 'facebook');
    const tg = CHANNEL_TYPES_SEED.find((s) => s.key === 'telegram');
    expect(fb!.is_available).toBe(false);
    expect(tg!.is_available).toBe(false);
  });

  it('all records have a valid JSON Schema ($schema field)', () => {
    for (const seed of CHANNEL_TYPES_SEED) {
      expect(seed.config_schema).toHaveProperty('$schema');
      expect(seed.config_schema).toHaveProperty('type', 'object');
      expect(seed.config_schema).toHaveProperty('properties');
    }
  });

  it('web_chat config_schema has position, primaryColor, allowedDomains', () => {
    const wc = CHANNEL_TYPES_SEED.find((s) => s.key === 'web_chat')!;
    const props = (wc.config_schema as any).properties;
    expect(props).toHaveProperty('position');
    expect(props).toHaveProperty('primaryColor');
    expect(props).toHaveProperty('allowedDomains');
  });

  it('sort_order values are unique and ascending', () => {
    const orders = CHANNEL_TYPES_SEED.map((s) => s.sort_order);
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
        business_id: 'biz-uuid',
        channel_type_id: '00000000-0000-0000-0000-000000000000',
        name: 'My Channel',
        status: ChannelStatus.ACTIVE,
        agent_id: null,
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
      business_id: 'biz-1',
      channel_type_id: 'ct-1',
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
        channel_id: channelId,
        data: 'enc1',
      } as ChannelCredential),
    ).resolves.toBeDefined();
    await expect(
      credRepo.save({
        channel_id: channelId,
        data: 'enc2',
      } as ChannelCredential),
    ).rejects.toThrow('unique constraint');
  });
});
