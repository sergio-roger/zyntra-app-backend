/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
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
import { Contact } from '@crm/entities/contact.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { ChannelsService } from '@/modules/channels/channels.service';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
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
  findByChannelId: jest.fn().mockResolvedValue(null),
  validateOriginAndGetChannel: jest.fn(),
});

const makeWidgetSessionService = () => ({
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
  verify: jest.fn(),
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
  config: {},
  channelType: { key: 'web_chat' } as any,
};

const WEB_CHAT_CHANNEL_WITH_AGENT: Partial<Channel> = {
  ...WEB_CHAT_CHANNEL,
  agent_id: 'agent-uuid-1',
};

const WIDGET_SESSION: WidgetSessionPayload = {
  businessId: 'biz-1',
  channelId: 'chan-web-1',
  visitorFingerprint: 'fp-abc',
  iat: 0,
  exp: 0,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let service: ChatService;
let conversationModel: ReturnType<typeof makeMongoModel>;
let messageModel: ReturnType<typeof makeMongoModel>;
let contactsRepo: Repository<Contact>;
let stageRepo: Repository<LifecycleStage>;
let channelsService: ReturnType<typeof makeChannelsService>;
let widgetSessionService: ReturnType<typeof makeWidgetSessionService>;
let agentQueue: ReturnType<typeof makeQueue>;
let gateway: ReturnType<typeof makeGateway>;

async function buildModule() {
  conversationModel = makeMongoModel();
  messageModel = makeMongoModel();
  contactsRepo = makeRepo<Contact>();
  stageRepo = makeRepo<LifecycleStage>();
  channelsService = makeChannelsService();
  widgetSessionService = makeWidgetSessionService();
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
      { provide: getRepositoryToken(Contact), useValue: contactsRepo },
      { provide: getRepositoryToken(LifecycleStage), useValue: stageRepo },
      { provide: ChannelsService, useValue: channelsService },
      { provide: getQueueToken(AGENT_RESPONSE_QUEUE), useValue: agentQueue },
      { provide: ChatGateway, useValue: gateway },
      { provide: WidgetSessionService, useValue: widgetSessionService },
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

    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL_WITH_AGENT,
    );
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
    const result = await service.processChat(
      { message: 'Hola' },
      WIDGET_SESSION,
    );

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
    await service.processChat({ message: 'Test' }, WIDGET_SESSION);
    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Test' }),
    );
  });

  it('does NOT emit socket message synchronously (waits for callback)', async () => {
    await service.processChat({ message: 'Test' }, WIDGET_SESSION);
    expect(gateway.emitNewMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 – processChat() with NO agent → returns fallback
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — channel WITHOUT agent', () => {
  beforeEach(async () => {
    await buildModule();

    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    ); // no agent_id
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
    const result = await service.processChat(
      { message: 'Hola' },
      WIDGET_SESSION,
    );
    expect(result.message).toBeTruthy();
    expect(result.pending).toBe(false);
  });

  it('does NOT enqueue a BullMQ job', async () => {
    await service.processChat({ message: 'Hola' }, WIDGET_SESSION);
    expect(agentQueue.add).not.toHaveBeenCalled();
  });

  it('emits socket event with fallback message', async () => {
    await service.processChat({ message: 'Hola' }, WIDGET_SESSION);
    expect(gateway.emitNewMessage).toHaveBeenCalledWith(
      'biz-1',
      'conv-456',
      expect.any(String),
      'assistant',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 3 – Conversation reuse (findOrCreate)
// ---------------------------------------------------------------------------
describe('ChatService: findOrCreate conversation', () => {
  beforeEach(async () => {
    await buildModule();
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );
    (messageModel.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('reuses an existing open conversation with same fingerprint', async () => {
    const existingConv = {
      _id: { toString: () => 'conv-existing' },
      business_id: 'biz-1',
    };
    (conversationModel.findOne as jest.Mock).mockResolvedValue(existingConv);
    const session = { ...WIDGET_SESSION, visitorFingerprint: 'fp-same' };

    const r1 = await service.processChat({ message: 'first' }, session);

    // Second call with same fingerprint but no conversation_id
    (conversationModel.findOne as jest.Mock).mockResolvedValue(existingConv);
    const r2 = await service.processChat({ message: 'second' }, session);

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
// Suite 6 – processChat() channel lookup (channelId always from widgetSession)
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — channel lookup', () => {
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

  it('loads the channel by widgetSession.channelId, never from the request body', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );

    await service.processChat({ message: 'hola' }, WIDGET_SESSION);

    expect(channelsService.findByChannelId).toHaveBeenCalledWith(
      'chan-web-1',
    );
  });

  it('throws NotFoundException when the channel does not resolve', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(null);

    await expect(
      service.processChat({ message: 'hola' }, WIDGET_SESSION),
    ).rejects.toThrow(NotFoundException);
  });

  it('treats an INACTIVE channel as not found', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      status: ChannelStatus.INACTIVE,
    });

    await expect(
      service.processChat({ message: 'hola' }, WIDGET_SESSION),
    ).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 – exchangeWidgetSession() (public_key -> session token exchange)
// ---------------------------------------------------------------------------
describe('ChatService.exchangeWidgetSession()', () => {
  beforeEach(async () => {
    await buildModule();
  });

  afterEach(() => jest.clearAllMocks());

  it('throws BadRequestException when public_key is missing', async () => {
    await expect(service.exchangeWidgetSession('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('signs a session token with businessId/channelId from the resolved channel', async () => {
    (
      channelsService.validateOriginAndGetChannel as jest.Mock
    ).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      config: { assistantName: 'Bot', greeting: 'Hola!' },
    });

    const result = await service.exchangeWidgetSession(
      'wpk_abc',
      'fp-visitor',
      'https://example.com',
    );

    expect(channelsService.validateOriginAndGetChannel).toHaveBeenCalledWith(
      'wpk_abc',
      'https://example.com',
      undefined,
    );
    expect(widgetSessionService.sign).toHaveBeenCalledWith({
      businessId: 'biz-1',
      channelId: 'chan-web-1',
      visitorFingerprint: 'fp-visitor',
    });
    expect(result.sessionToken).toBe('signed.jwt.token');
    expect(result.expiresIn).toBe(WidgetSessionService.EXPIRES_IN_SECONDS);
    expect(result.name).toBe('Bot');
    expect(result.greeting).toBe('Hola!');
  });

  it('generates a fallback visitor fingerprint when fp is not provided', async () => {
    (
      channelsService.validateOriginAndGetChannel as jest.Mock
    ).mockResolvedValue(WEB_CHAT_CHANNEL);

    await service.exchangeWidgetSession('wpk_abc');

    const signedPayload = (widgetSessionService.sign as jest.Mock).mock
      .calls[0][0];
    expect(typeof signedPayload.visitorFingerprint).toBe('string');
    expect(signedPayload.visitorFingerprint.length).toBeGreaterThan(0);
  });

  it('throws NotFoundException when the resolved channel is not active', async () => {
    (
      channelsService.validateOriginAndGetChannel as jest.Mock
    ).mockResolvedValue({
      ...WEB_CHAT_CHANNEL,
      status: ChannelStatus.INACTIVE,
    });

    await expect(service.exchangeWidgetSession('wpk_abc')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propagates UnauthorizedException for an invalid/revoked public_key or disallowed origin', async () => {
    (
      channelsService.validateOriginAndGetChannel as jest.Mock
    ).mockRejectedValue(new UnauthorizedException());

    await expect(service.exchangeWidgetSession('wpk_bad')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 8 – captureLead()
// ---------------------------------------------------------------------------
describe('ChatService.captureLead()', () => {
  beforeEach(async () => {
    await buildModule();
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('throws BadRequestException when neither email nor phone is provided', async () => {
    await expect(
      service.captureLead({ name: 'Visitante' } as any, WIDGET_SESSION),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a new contact scoped to the widgetSession businessId/channelId', async () => {
    (contactsRepo.findOne as jest.Mock).mockResolvedValue(null);
    (stageRepo.findOne as jest.Mock).mockResolvedValue({ id: 'stage-1' });
    (contactsRepo.save as jest.Mock).mockImplementation((c: any) => {
      c.id = 'contact-1';
      return Promise.resolve(c);
    });

    const result = await service.captureLead(
      { name: 'Visitante', email: 'a@b.com' } as any,
      WIDGET_SESSION,
    );

    expect(contactsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        channelId: 'chan-web-1',
        email: 'a@b.com',
      }),
    );
    expect(result).toEqual({
      success: true,
      contact_id: 'contact-1',
      message: 'Lead capturado',
    });
  });

  it('updates an existing contact instead of creating a duplicate', async () => {
    (contactsRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'contact-existing',
      name: 'Old name',
    });
    (contactsRepo.save as jest.Mock).mockImplementation((c: any) =>
      Promise.resolve(c),
    );

    const result = await service.captureLead(
      { name: 'Nuevo nombre', email: 'a@b.com' } as any,
      WIDGET_SESSION,
    );

    expect(result).toEqual({
      success: true,
      contact_id: 'contact-existing',
      message: 'Lead actualizado',
    });
    expect(contactsRepo.create).not.toHaveBeenCalled();
  });
});
