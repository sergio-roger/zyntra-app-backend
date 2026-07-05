/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ObjectLiteral, Repository } from 'typeorm';

import { ChatService, AGENT_RESPONSE_QUEUE } from '../chat.service';
import { Conversation } from '../schemas/conversation.schema';
import { Message } from '../schemas/message.schema';
import { ChatbotConfig } from '../entities/chatbot-config.entity';
import { Contact } from '@crm/entities/contact.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { ChannelsService } from '@/modules/channels/channels.service';
import { ChatGateway } from '../chat.gateway';

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

const makeMongoModel = () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    }),
  }),
  create: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({}),
  lean: jest.fn(),
});

const makeQueue = () => ({
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
});

const makeChannelsService = () => ({
  findAllByBusiness: jest.fn().mockResolvedValue([]),
  findByChannelId: jest.fn().mockResolvedValue(null),
});

const makeGateway = () => ({
  emitNewMessage: jest.fn(),
  emitConversationStatusChanged: jest.fn(),
});

const WEB_CHAT_CHANNEL: Partial<Channel> = {
  id: 'chan-web-1',
  business_id: 'biz-1',
  agent_id: null,
  status: ChannelStatus.ACTIVE,
  channelType: { key: 'web_chat' } as any,
};

const WEB_CHAT_CHANNEL_WITH_AGENT: Partial<Channel> = {
  ...WEB_CHAT_CHANNEL,
  agent_id: 'agent-uuid-1',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let service: ChatService;
let conversationModel: ReturnType<typeof makeMongoModel>;
let messageModel: ReturnType<typeof makeMongoModel>;
let channelsService: ReturnType<typeof makeChannelsService>;
let agentQueue: ReturnType<typeof makeQueue>;
let gateway: ReturnType<typeof makeGateway>;

async function buildModule() {
  conversationModel = makeMongoModel();
  messageModel = makeMongoModel();
  channelsService = makeChannelsService();
  agentQueue = makeQueue();
  gateway = makeGateway();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ChatService,
      {
        provide: getModelToken(Conversation.name),
        useValue: conversationModel,
      },
      { provide: getModelToken(Message.name), useValue: messageModel },
      {
        provide: getRepositoryToken(ChatbotConfig),
        useValue: makeRepo<ChatbotConfig>(),
      },
      { provide: getRepositoryToken(Contact), useValue: makeRepo<Contact>() },
      {
        provide: getRepositoryToken(LifecycleStage),
        useValue: makeRepo<LifecycleStage>(),
      },
      { provide: ChannelsService, useValue: channelsService },
      { provide: getQueueToken(AGENT_RESPONSE_QUEUE), useValue: agentQueue },
      { provide: ChatGateway, useValue: gateway },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, fallback = '') =>
            key === 'SERVICE_TOKEN' ? 'test-token' : fallback,
        },
      },
    ],
  }).compile();

  service = module.get<ChatService>(ChatService);
}

// ---------------------------------------------------------------------------
// Suite 1 – processChat() with agent assigned → enqueues BullMQ job
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — channel WITH agent', () => {
  beforeEach(async () => {
    await buildModule();

    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      WEB_CHAT_CHANNEL_WITH_AGENT,
    ]);
    // Simulate no existing conversation → create new one
    (conversationModel.findOne as jest.Mock).mockResolvedValue(null);
    const fakeConv = {
      _id: { toString: () => 'conv-123' },
      business_id: 'biz-1',
    };
    (conversationModel.create as jest.Mock).mockResolvedValue(fakeConv);
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('adds a job to the agent-response queue', async () => {
    const result = await service.processChat({
      business_id: 'biz-1',
      message: 'Hola',
      visitor: { fingerprint: 'fp-abc' },
    });

    expect(agentQueue.add).toHaveBeenCalledWith(
      'agent-response',
      expect.objectContaining({
        conversationId: 'conv-123',
        agentId: 'agent-uuid-1',
        businessId: 'biz-1',
      }),
      expect.any(Object),
    );
    expect(result.pending).toBe(true);
    expect(result.message).toBe('');
  });

  it('persists user message before enqueuing', async () => {
    await service.processChat({ business_id: 'biz-1', message: 'Test' });
    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Test' }),
    );
  });

  it('does NOT emit socket message synchronously (waits for callback)', async () => {
    await service.processChat({ business_id: 'biz-1', message: 'Test' });
    expect(gateway.emitNewMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 – processChat() with NO agent → returns fallback
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — channel WITHOUT agent', () => {
  beforeEach(async () => {
    await buildModule();

    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      WEB_CHAT_CHANNEL,
    ]); // no agent_id
    (conversationModel.findOne as jest.Mock).mockResolvedValue(null);
    const fakeConv = {
      _id: { toString: () => 'conv-456' },
      business_id: 'biz-1',
    };
    (conversationModel.create as jest.Mock).mockResolvedValue(fakeConv);
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('returns fallback message without pending flag', async () => {
    const result = await service.processChat({
      business_id: 'biz-1',
      message: 'Hola',
    });
    expect(result.message).toBeTruthy();
    expect(result.pending).toBe(false);
  });

  it('does NOT enqueue a BullMQ job', async () => {
    await service.processChat({ business_id: 'biz-1', message: 'Hola' });
    expect(agentQueue.add).not.toHaveBeenCalled();
  });

  it('emits socket event with fallback message', async () => {
    await service.processChat({ business_id: 'biz-1', message: 'Hola' });
    expect(gateway.emitNewMessage).toHaveBeenCalledWith(
      'biz-1',
      'conv-456',
      expect.any(String),
      'assistant',
    );
  });

  it('throws BadRequestException when business_id is missing', async () => {
    await expect(
      service.processChat({ business_id: '', message: 'test' }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 – Conversation reuse (findOrCreate)
// ---------------------------------------------------------------------------
describe('ChatService: findOrCreate conversation', () => {
  beforeEach(async () => {
    await buildModule();
    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      WEB_CHAT_CHANNEL,
    ]);
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('reuses an existing open conversation with same fingerprint', async () => {
    const existingConv = {
      _id: { toString: () => 'conv-existing' },
      business_id: 'biz-1',
    };
    (conversationModel.findOne as jest.Mock).mockResolvedValue(existingConv);

    const r1 = await service.processChat({
      business_id: 'biz-1',
      message: 'first',
      visitor: { fingerprint: 'fp-same' },
    });

    // Second call with same fingerprint but no conversation_id
    (conversationModel.findOne as jest.Mock).mockResolvedValue(existingConv);
    const r2 = await service.processChat({
      business_id: 'biz-1',
      message: 'second',
      visitor: { fingerprint: 'fp-same' },
    });

    expect(r1.conversation_id).toBe('conv-existing');
    expect(r2.conversation_id).toBe('conv-existing');
    // create() should NOT have been called since we found an existing conversation
    expect(conversationModel.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 – handleAgentCallback()
// ---------------------------------------------------------------------------
describe('ChatService.handleAgentCallback()', () => {
  beforeEach(async () => {
    await buildModule();
  });

  afterEach(() => jest.clearAllMocks());

  it('throws UnauthorizedException with invalid service token', async () => {
    await expect(
      service.handleAgentCallback({
        conversationId: '507f1f77bcf86cd799439011',
        businessId: 'biz-1',
        jobId: 'job-1',
        reply: 'Hello',
        serviceToken: 'WRONG-TOKEN',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('persists assistant message and emits socket event', async () => {
    (messageModel.findOne as jest.Mock).mockResolvedValue(null); // no duplicate
    (messageModel.create as jest.Mock).mockResolvedValue({});

    await service.handleAgentCallback({
      conversationId: '507f1f77bcf86cd799439011',
      businessId: 'biz-1',
      jobId: 'job-unique-1',
      reply: 'Respuesta del agente',
      serviceToken: 'test-token',
    });

    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: 'Respuesta del agente',
        job_id: 'job-unique-1',
      }),
    );
    expect(gateway.emitNewMessage).toHaveBeenCalledWith(
      'biz-1',
      '507f1f77bcf86cd799439011',
      'Respuesta del agente',
      'assistant',
    );
  });

  it('is idempotent: duplicate job_id does not create a second message', async () => {
    // Simulates an existing message with the same job_id
    (messageModel.findOne as jest.Mock).mockResolvedValue({
      job_id: 'job-dup',
    });

    const result = await service.handleAgentCallback({
      conversationId: '507f1f77bcf86cd799439011',
      businessId: 'biz-1',
      jobId: 'job-dup',
      reply: 'Second attempt',
      serviceToken: 'test-token',
    });

    expect(result).toEqual({ ok: true, duplicate: true });
    expect(messageModel.create).not.toHaveBeenCalled();
    expect(gateway.emitNewMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 – updateConversationStatus()
// ---------------------------------------------------------------------------
describe('ChatService.updateConversationStatus()', () => {
  beforeEach(async () => {
    await buildModule();
  });

  afterEach(() => jest.clearAllMocks());

  it('throws NotFoundException when conversation not found', async () => {
    (conversationModel.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      service.updateConversationStatus('biz-1', 'bad-id', 'closed'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for invalid status', async () => {
    (conversationModel.findById as jest.Mock).mockResolvedValue({
      _id: 'conv-1',
      business_id: 'biz-1',
    });
    await expect(
      service.updateConversationStatus('biz-1', 'conv-1', 'invalid-status'),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates status and emits socket event', async () => {
    const conv = { _id: { toString: () => 'conv-1' }, business_id: 'biz-1' };
    (conversationModel.findById as jest.Mock).mockResolvedValue(conv);

    const result = await service.updateConversationStatus(
      'biz-1',
      'conv-1',
      'closed',
    );

    expect(result).toEqual({ success: true, status: 'closed' });
    expect(gateway.emitConversationStatusChanged).toHaveBeenCalledWith(
      'biz-1',
      'conv-1',
      'closed',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 6 – Channel resolution: channel_id priority, business_id fallback
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — channel resolution', () => {
  beforeEach(async () => {
    await buildModule();
    (conversationModel.findOne as jest.Mock).mockResolvedValue(null);
    (conversationModel.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'conv-res' },
      business_id: 'biz-1',
    });
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('resolves by channel_id when provided, without consulting business_id fallback', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );

    await service.processChat({
      business_id: 'biz-1',
      channel_id: 'chan-web-1',
      message: 'hola',
    });

    expect(channelsService.findByChannelId).toHaveBeenCalledWith('chan-web-1');
    expect(channelsService.findAllByBusiness).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when channel_id does not resolve to an active channel', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(null);

    await expect(
      service.processChat({
        business_id: 'biz-1',
        channel_id: 'missing-chan',
        message: 'hola',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('treats an INACTIVE channel resolved by channel_id as not found', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      status: ChannelStatus.INACTIVE,
    });

    await expect(
      service.processChat({
        business_id: 'biz-1',
        channel_id: 'chan-web-1',
        message: 'hola',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('falls back to business_id and uses the first active web channel when channel_id is absent', async () => {
    const second = { ...WEB_CHAT_CHANNEL, id: 'chan-web-2' };
    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      WEB_CHAT_CHANNEL,
      second,
    ]);

    await service.processChat({ business_id: 'biz-1', message: 'hola' });

    expect(channelsService.findAllByBusiness).toHaveBeenCalledWith('biz-1');
    // conversation is created against the FIRST active channel (chan-web-1)
    expect(conversationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ channel_id: 'chan-web-1' }),
    );
  });

  it('ignores inactive channels when picking the business_id fallback', async () => {
    const inactive = {
      ...WEB_CHAT_CHANNEL,
      id: 'chan-inactive',
      status: ChannelStatus.INACTIVE,
    };
    const active = { ...WEB_CHAT_CHANNEL, id: 'chan-active' };
    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      inactive,
      active,
    ]);

    await service.processChat({ business_id: 'biz-1', message: 'hola' });

    expect(conversationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ channel_id: 'chan-active' }),
    );
  });

  it('throws NotFoundException when the business has channels but none are active', async () => {
    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([
      { ...WEB_CHAT_CHANNEL, status: ChannelStatus.INACTIVE },
    ]);

    await expect(
      service.processChat({ business_id: 'biz-1', message: 'hola' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('falls back to the legacy chatbot_config flow when the business has zero channels', async () => {
    (channelsService.findAllByBusiness as jest.Mock).mockResolvedValue([]);

    // legacyProcessChat will throw NotFoundException because ChatbotConfig repo
    // (mocked via makeRepo) has no config for this business — that's enough to
    // prove we reached the legacy path instead of resolving a Channel.
    await expect(
      service.processChat({ business_id: 'biz-1', message: 'hola' }),
    ).rejects.toThrow(NotFoundException);
    expect(channelsService.findByChannelId).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 7 – Origin/Referer validation against channel.config.allowedDomains
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — allowed origin validation', () => {
  beforeEach(async () => {
    await buildModule();
    (conversationModel.findOne as jest.Mock).mockResolvedValue(null);
    (conversationModel.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'conv-origin' },
      business_id: 'biz-1',
    });
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('rejects with ForbiddenException when Origin does not match allowedDomains', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      config: { allowedDomains: ['example.com'] },
    });

    await expect(
      service.processChat(
        { business_id: 'biz-1', channel_id: 'chan-web-1', message: 'hola' },
        undefined,
        'https://evil.com',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows the request when Origin matches an allowed domain', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      config: { allowedDomains: ['example.com'] },
    });

    const result = await service.processChat(
      { business_id: 'biz-1', channel_id: 'chan-web-1', message: 'hola' },
      undefined,
      'https://example.com',
    );

    expect(result.conversation_id).toBe('conv-origin');
  });

  it('allows a subdomain of an allowed domain', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      config: { allowedDomains: ['example.com'] },
    });

    const result = await service.processChat(
      { business_id: 'biz-1', channel_id: 'chan-web-1', message: 'hola' },
      undefined,
      undefined,
      'https://app.example.com/widget',
    );

    expect(result.conversation_id).toBe('conv-origin');
  });

  it('allows any origin when allowedDomains is not configured', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      config: {},
    });

    const result = await service.processChat(
      { business_id: 'biz-1', channel_id: 'chan-web-1', message: 'hola' },
      undefined,
      'https://anything.example.net',
    );

    expect(result.conversation_id).toBe('conv-origin');
  });
});
