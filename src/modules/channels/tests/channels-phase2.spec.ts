import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';

import { ChannelsService } from '@/modules/channels/channels.service';
import { ChannelCredential } from '@/modules/channels/entities/channel-credential.entity';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { ChannelProviderFactory } from '@/modules/channels/providers/channel-provider.factory';
import { WebChatChannelProvider } from '@/modules/channels/providers/web-chat-channel.provider';
import {
  decryptCredentials,
  encryptCredentials,
} from '@/modules/channels/utils/crypto.util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRepo = <T extends ObjectLiteral>() =>
  ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v as T),
    remove: jest.fn(),
  }) as unknown as Repository<T>;

const WEB_CHAT_TYPE: ChannelType = {
  id: 'ct-web-uuid',
  key: 'web_chat',
  label: 'Web Chat',
  description: null,
  icon_url: null,
  is_available: true,
  config_schema: {},
  sort_order: 1,
  created_at: new Date(),
  updated_at: new Date(),
  channels: [],
};

const FACEBOOK_TYPE: ChannelType = {
  ...WEB_CHAT_TYPE,
  id: 'ct-fb-uuid',
  key: 'facebook',
  is_available: false,
};

// ---------------------------------------------------------------------------
// Suite 1 – ChannelProviderFactory
// ---------------------------------------------------------------------------
describe('ChannelProviderFactory', () => {
  let factory: ChannelProviderFactory;

  beforeEach(() => {
    factory = new ChannelProviderFactory();
  });

  it('returns WebChatChannelProvider for web_chat', () => {
    const provider = factory.getProvider('web_chat');
    expect(provider).toBeInstanceOf(WebChatChannelProvider);
  });

  it('returns a provider for facebook (stub)', () => {
    expect(() => factory.getProvider('facebook')).not.toThrow();
  });

  it('returns a provider for telegram (stub)', () => {
    expect(() => factory.getProvider('telegram')).not.toThrow();
  });

  it('throws BadRequestException for unknown channel type', () => {
    expect(() => factory.getProvider('whatsapp')).toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 – WebChatChannelProvider.validateConfig()
// ---------------------------------------------------------------------------
describe('WebChatChannelProvider.validateConfig()', () => {
  let provider: WebChatChannelProvider;

  beforeEach(() => {
    provider = new WebChatChannelProvider();
  });

  it('passes with empty config', () => {
    expect(() => provider.validateConfig({})).not.toThrow();
  });

  it('passes with valid config', () => {
    expect(() =>
      provider.validateConfig({
        position: 'bottom-right',
        primaryColor: '#6366f1',
        allowedDomains: ['example.com', 'app.mysite.io'],
      }),
    ).not.toThrow();
  });

  it('rejects invalid position', () => {
    expect(() => provider.validateConfig({ position: 'top-left' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects malformed primaryColor (no hash)', () => {
    expect(() => provider.validateConfig({ primaryColor: '6366f1' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects primaryColor with invalid chars', () => {
    expect(() => provider.validateConfig({ primaryColor: '#GGGGGG' })).toThrow(
      BadRequestException,
    );
  });

  it('accepts 3-char hex color', () => {
    expect(() =>
      provider.validateConfig({ primaryColor: '#fff' }),
    ).not.toThrow();
  });

  it('rejects allowedDomains that is not an array', () => {
    expect(() =>
      provider.validateConfig({ allowedDomains: 'example.com' }),
    ).toThrow(BadRequestException);
  });

  it('rejects allowedDomains with malformed domain', () => {
    expect(() =>
      provider.validateConfig({ allowedDomains: ['not_a_domain!'] }),
    ).toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 – WebChatChannelProvider.setup()
// ---------------------------------------------------------------------------
describe('WebChatChannelProvider.setup()', () => {
  let provider: WebChatChannelProvider;

  beforeEach(() => {
    provider = new WebChatChannelProvider();
  });

  it('returns embedCode containing the businessId', async () => {
    const bizId = 'biz-abc-123';
    const result = await provider.setup('chan-1', bizId, {
      position: 'bottom-right',
    });
    expect(result.embedCode).toContain(`data-business-id="${bizId}"`);
  });

  it('returns embedCode containing the channelId', async () => {
    const chanId = 'chan-xyz';
    const result = await provider.setup(chanId, 'biz-1', {});
    expect(result.embedCode).toContain(`data-channel-id="${chanId}"`);
  });

  it('returns embedCode with correct position data attribute', async () => {
    const result = await provider.setup('c', 'b', { position: 'bottom-left' });
    expect(result.embedCode).toContain('data-position="bottom-left"');
  });

  it('uses default position bottom-right when not provided', async () => {
    const result = await provider.setup('c', 'b', {});
    expect(result.embedCode).toContain('data-position="bottom-right"');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 – AES-256-GCM encrypt/decrypt round-trip
// ---------------------------------------------------------------------------
describe('encryptCredentials / decryptCredentials', () => {
  const KEY = 'a'.repeat(64); // 32 bytes as 64-char hex

  beforeEach(() => {
    process.env.CHANNEL_CREDENTIALS_KEY = KEY;
  });

  afterEach(() => {
    delete process.env.CHANNEL_CREDENTIALS_KEY;
  });

  it('round-trips arbitrary data', () => {
    const data = { token: 'secret', page_id: '12345' };
    const encrypted = encryptCredentials(data);
    const decrypted = decryptCredentials(encrypted);
    expect(decrypted).toEqual(data);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const data = { x: 1 };
    const a = encryptCredentials(data);
    const b = encryptCredentials(data);
    expect(a).not.toBe(b);
  });

  it('encrypted string has 3 colon-separated parts', () => {
    const enc = encryptCredentials({ k: 'v' });
    expect(enc.split(':')).toHaveLength(3);
  });

  it('throws when CHANNEL_CREDENTIALS_KEY is not set', () => {
    delete process.env.CHANNEL_CREDENTIALS_KEY;
    expect(() => encryptCredentials({})).toThrow('CHANNEL_CREDENTIALS_KEY');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 – ChannelsService unit tests
// ---------------------------------------------------------------------------
describe('ChannelsService', () => {
  let service: ChannelsService;
  let channelTypeRepo: Repository<ChannelType>;
  let channelRepo: Repository<Channel>;
  let credentialRepo: Repository<ChannelCredential>;
  let factory: ChannelProviderFactory;

  const KEY = 'b'.repeat(64);

  beforeEach(async () => {
    process.env.CHANNEL_CREDENTIALS_KEY = KEY;

    channelTypeRepo = makeRepo<ChannelType>();
    channelRepo = makeRepo<Channel>();
    credentialRepo = makeRepo<ChannelCredential>();
    factory = new ChannelProviderFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        { provide: getRepositoryToken(ChannelType), useValue: channelTypeRepo },
        { provide: getRepositoryToken(Channel), useValue: channelRepo },
        {
          provide: getRepositoryToken(ChannelCredential),
          useValue: credentialRepo,
        },
        { provide: ChannelProviderFactory, useValue: factory },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  afterEach(() => {
    delete process.env.CHANNEL_CREDENTIALS_KEY;
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a web_chat channel and returns embedCode', async () => {
      (channelTypeRepo.findOne as jest.Mock).mockResolvedValue(WEB_CHAT_TYPE);
      const savedChannel = {
        id: 'new-chan',
        business_id: 'biz-1',
        config: {},
        channelType: WEB_CHAT_TYPE,
      };
      (channelRepo.save as jest.Mock).mockResolvedValue(savedChannel);
      (credentialRepo.save as jest.Mock).mockResolvedValue({});

      const result = await service.create('biz-1', {
        channelTypeId: 'ct-web-uuid',
        name: 'Mi Chat',
        config: { position: 'bottom-right', primaryColor: '#fff' },
      });

      expect(result.embedCode).toBeDefined();
      expect(result.embedCode).toContain('biz-1');
    });

    it('throws NotFoundException when channelTypeId does not exist', async () => {
      (channelTypeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('biz-1', { channelTypeId: 'bad-id', name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when channel type is_available=false', async () => {
      (channelTypeRepo.findOne as jest.Mock).mockResolvedValue(FACEBOOK_TYPE);

      await expect(
        service.create('biz-1', { channelTypeId: 'ct-fb-uuid', name: 'FB' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid config (bad primaryColor)', async () => {
      (channelTypeRepo.findOne as jest.Mock).mockResolvedValue(WEB_CHAT_TYPE);

      await expect(
        service.create('biz-1', {
          channelTypeId: 'ct-web-uuid',
          name: 'X',
          config: { primaryColor: 'not-a-color' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne()', () => {
    it('throws NotFoundException when channel not found', async () => {
      (channelRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('biz-1', 'chan-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertOwnership()', () => {
    it('throws ForbiddenException when businessIds differ', () => {
      expect(() => service.assertOwnership('biz-A', 'biz-B')).toThrow(
        ForbiddenException,
      );
    });

    it('does not throw when businessIds match', () => {
      expect(() => service.assertOwnership('biz-A', 'biz-A')).not.toThrow();
    });
  });

  describe('remove()', () => {
    it('removes the channel and returns success', async () => {
      const channel = {
        id: 'c1',
        business_id: 'biz-1',
        channelType: WEB_CHAT_TYPE,
      } as Channel;
      (channelRepo.findOne as jest.Mock).mockResolvedValue(channel);
      (channelRepo.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await service.remove('biz-1', 'c1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('findAllByBusiness()', () => {
    it('returns every web_chat channel of the business, not just one', async () => {
      const channels = [
        {
          id: 'c1',
          business_id: 'biz-1',
          name: 'Sitio principal',
          channelType: WEB_CHAT_TYPE,
        },
        {
          id: 'c2',
          business_id: 'biz-1',
          name: 'Landing campaña verano',
          channelType: WEB_CHAT_TYPE,
        },
      ] as Channel[];
      (channelRepo.find as jest.Mock).mockResolvedValue(channels);

      const result = await service.findAllByBusiness('biz-1');

      expect(result).toHaveLength(2);
      expect(channelRepo.find).toHaveBeenCalledWith({
        where: { business_id: 'biz-1', channelType: { key: 'web_chat' } },
        relations: ['channelType'],
        order: { created_at: 'DESC' },
      });
    });

    it('is scoped by business_id (multi-tenant filter present in the query)', async () => {
      (channelRepo.find as jest.Mock).mockResolvedValue([]);

      await service.findAllByBusiness('biz-2');

      const findMock = channelRepo.find as jest.Mock<
        Promise<Channel[]>,
        [FindManyOptions<Channel>]
      >;
      const call = findMock.mock.calls[0][0];
      expect((call.where as { business_id: string }).business_id).toBe('biz-2');
    });
  });

  describe('findByChannelId()', () => {
    it('resolves a channel by id alone, without requiring business_id', async () => {
      const channel = {
        id: 'chan-9',
        business_id: 'biz-1',
        name: 'Landing campaña verano',
        channelType: WEB_CHAT_TYPE,
      } as Channel;
      (channelRepo.findOne as jest.Mock).mockResolvedValue(channel);

      const result = await service.findByChannelId('chan-9');

      expect(result).toEqual(channel);
      expect(channelRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'chan-9', channelType: { key: 'web_chat' } },
        relations: ['channelType'],
      });
    });

    it('returns null when the channel does not exist', async () => {
      (channelRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByChannelId('missing-id');

      expect(result).toBeNull();
    });

    it('still resolves a channel whose status is INACTIVE (soft-disable does not break existing references)', async () => {
      const inactiveChannel = {
        id: 'chan-9',
        business_id: 'biz-1',
        status: ChannelStatus.INACTIVE,
        channelType: WEB_CHAT_TYPE,
      } as Channel;
      (channelRepo.findOne as jest.Mock).mockResolvedValue(inactiveChannel);

      const result = await service.findByChannelId('chan-9');

      expect(result?.status).toBe(ChannelStatus.INACTIVE);
    });
  });

  describe('update() — soft-disable via status', () => {
    it('sets status to INACTIVE without deleting the row', async () => {
      const channel = {
        id: 'chan-9',
        business_id: 'biz-1',
        status: ChannelStatus.ACTIVE,
        channelType: WEB_CHAT_TYPE,
      } as Channel;
      (channelRepo.findOne as jest.Mock).mockResolvedValue(channel);
      (channelRepo.save as jest.Mock).mockImplementation((c) =>
        Promise.resolve(c),
      );

      const result = await service.update('biz-1', 'chan-9', {
        status: ChannelStatus.INACTIVE,
      });

      expect(result.status).toBe(ChannelStatus.INACTIVE);
      expect(channelRepo.remove).not.toHaveBeenCalled();
    });
  });
});
