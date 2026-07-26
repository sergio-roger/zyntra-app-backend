/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ObjectLiteral } from 'typeorm';

import { ChatService } from '../chat.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { ChannelStatus } from '@/modules/channels/enums/channel-status.enum';
import { ChannelsService } from '@/modules/channels/channels.service';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import { ChatGateway } from '../chat.gateway';
import { MessageEncryptionService } from '../services/message-encryption.service';
import { getQueueToken } from '@nestjs/bullmq';
import { AGENT_RESPONSE_QUEUE } from '@/modules/chatbot/constants/chatbot.constants';
import { ContactsService } from '@crm/contacts.service';
import { AgentsService } from '@/modules/agents/agents.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRepo = <T extends ObjectLiteral>() => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
  };
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn((v) => Promise.resolve(v)),
    create: jest.fn(
      (v: any) => ({ id: 'conv-mock-123', ...v }) as unknown as T,
    ),
    remove: jest.fn(),
    softRemove: jest.fn().mockResolvedValue({ success: true }),
    update: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as any;
};

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
  businessId: 'biz-1',
  agentId: null,
  status: ChannelStatus.ACTIVE,
  config: {},
  channelType: { key: 'web_chat' } as any,
};

const WEB_CHAT_CHANNEL_WITH_AGENT: Partial<Channel> = {
  ...WEB_CHAT_CHANNEL,
  agentId: 'agent-uuid-1',
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
let conversationRepo: ReturnType<typeof makeRepo>;
let messageRepo: ReturnType<typeof makeRepo>;
let channelsService: ReturnType<typeof makeChannelsService>;
let widgetSessionService: ReturnType<typeof makeWidgetSessionService>;
let gateway: ReturnType<typeof makeGateway>;

async function buildModule() {
  conversationRepo = makeRepo<Conversation>();
  messageRepo = makeRepo<Message>();
  channelsService = makeChannelsService();
  widgetSessionService = makeWidgetSessionService();
  gateway = makeGateway();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ChatService,
      {
        provide: getRepositoryToken(Conversation),
        useValue: conversationRepo,
      },
      {
        provide: getRepositoryToken(Message),
        useValue: messageRepo,
      },
      { provide: ChannelsService, useValue: channelsService },
      { provide: ChatGateway, useValue: gateway },
      { provide: WidgetSessionService, useValue: widgetSessionService },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, fallback = '') =>
            key === 'SERVICE_TOKEN' ? 'test-token' : fallback,
        },
      },
      {
        provide: MessageEncryptionService,
        useValue: {
          encrypt: jest.fn((v: string) => `enc_${v}`),
          decrypt: jest.fn((v: string) => v.replace(/^enc_/, '')),
        },
      },
      {
        provide: JwtService,
        useValue: {
          sign: jest.fn().mockReturnValue('signed-jwt'),
          verify: jest.fn().mockReturnValue({}),
        },
      },
      {
        provide: ContactsService,
        useValue: {
          findOne: jest.fn(),
          create: jest.fn(),
        },
      },
      {
        provide: AgentsService,
        useValue: {
          findOne: jest.fn(),
        },
      },
      {
        provide: getQueueToken(AGENT_RESPONSE_QUEUE),
        useValue: {
          add: jest.fn(),
        },
      },
    ],
  }).compile();

  service = module.get<ChatService>(ChatService);
}

// ---------------------------------------------------------------------------
// Suite 1 – processChat() never injects an automatic reply
// ---------------------------------------------------------------------------
describe('ChatService.processChat() — no automatic reply is ever injected', () => {
  beforeEach(async () => {
    await buildModule();

    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(null);
    const fakeConv = { id: 'conv-456', businessId: 'biz-1' };
    (conversationRepo.create as jest.Mock).mockReturnValue(fakeConv);
    (messageRepo.create as jest.Mock).mockReturnValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('returns immediately with no pending reply and an empty message', async () => {
    const result = await service.processChat(
      { message: 'Hola' },
      WIDGET_SESSION,
    );
    expect(result.pending).toBe(false);
    expect(result.message).toBe('');
  });

  it('persists the user message', async () => {
    await service.processChat({ message: 'Test' }, WIDGET_SESSION);
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', contentEncrypted: 'enc_Test' }),
    );
  });

  it('only emits the user message over the socket, never an assistant/agent one', async () => {
    await service.processChat({ message: 'Test' }, WIDGET_SESSION);
    expect(gateway.emitNewMessage).toHaveBeenCalledWith(
      'biz-1',
      'conv-456',
      'Test',
      'user',
    );
    expect(gateway.emitNewMessage).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'assistant',
    );
    expect(gateway.emitNewMessage).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'agent',
    );
  });

  it('adds a job to agentResponseQueue and returns pending: true when channel has an agentId', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL_WITH_AGENT,
    );
    const result = await service.processChat(
      { message: 'Hola' },
      WIDGET_SESSION,
    );
    expect(result.pending).toBe(true);
    expect(result.message).toBe('');
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
    (messageRepo.create as jest.Mock).mockReturnValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('reuses an existing open conversation with same fingerprint', async () => {
    const existingConv = {
      id: 'conv-existing',
      businessId: 'biz-1',
    };
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(existingConv);
    (conversationRepo._queryBuilder.getOne as jest.Mock).mockResolvedValue(
      existingConv,
    );
    const session = { ...WIDGET_SESSION, visitorFingerprint: 'fp-same' };

    const r1 = await service.processChat({ message: 'first' }, session);

    // Second call with same fingerprint but no conversation_id
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(existingConv);
    const r2 = await service.processChat({ message: 'second' }, session);

    expect(r1.conversation_id).toBe('conv-existing');
    expect(r2.conversation_id).toBe('conv-existing');
    // create() should NOT have been called since we found an existing conversation
    expect(conversationRepo.create).not.toHaveBeenCalled();
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
        conversationId: '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
        businessId: 'biz-1',
        jobId: 'job-1',
        reply: 'Hello',
        serviceToken: 'WRONG-TOKEN',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('persists assistant message and emits socket event', async () => {
    (messageRepo.findOne as jest.Mock).mockResolvedValue(null); // no duplicate
    (messageRepo.create as jest.Mock).mockReturnValue({});

    await service.handleAgentCallback({
      conversationId: '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
      businessId: 'biz-1',
      jobId: 'job-unique-1',
      reply: 'Respuesta del agente',
      serviceToken: 'test-token',
    });

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        contentEncrypted: 'enc_Respuesta del agente',
        jobId: 'job-unique-1',
      }),
    );
    expect(gateway.emitNewMessage).toHaveBeenCalledWith(
      'biz-1',
      '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
      'Respuesta del agente',
      'assistant',
    );
  });

  it('is idempotent: duplicate jobId does not create a second message', async () => {
    // Simulates an existing message with the same jobId
    (messageRepo.findOneBy as jest.Mock).mockResolvedValue({
      jobId: 'job-dup',
    });

    const result = await service.handleAgentCallback({
      conversationId: '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
      businessId: 'biz-1',
      jobId: 'job-dup',
      reply: 'Second attempt',
      serviceToken: 'test-token',
    });

    expect(result).toEqual({ ok: true, duplicate: true });
    expect(messageRepo.create).not.toHaveBeenCalled();
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
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(null);
    await expect(
      service.updateConversationStatus(
        'biz-1',
        '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
        'closed',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for invalid status', async () => {
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue({
      id: 'conv-1',
      businessId: 'biz-1',
    });
    await expect(
      service.updateConversationStatus(
        'biz-1',
        '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
        'invalid-status',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates status and emits socket event', async () => {
    const conv = { id: 'conv-1', businessId: 'biz-1' };
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(conv);

    const result = await service.updateConversationStatus(
      'biz-1',
      '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
      'closed',
    );

    expect(result).toEqual({ success: true, status: 'closed' });
    expect(gateway.emitConversationStatusChanged).toHaveBeenCalledWith(
      'biz-1',
      '507f1f77-bcf8-6cd7-9943-9011a5c0e5a0',
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
    (conversationRepo.findOneBy as jest.Mock).mockResolvedValue(null);
    (conversationRepo.create as jest.Mock).mockReturnValue({
      id: 'conv-res',
      businessId: 'biz-1',
    });
    (messageRepo.create as jest.Mock).mockReturnValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('loads the channel by widgetSession.channelId, never from the request body', async () => {
    (channelsService.findByChannelId as jest.Mock).mockResolvedValue(
      WEB_CHAT_CHANNEL,
    );

    await service.processChat({ message: 'hola' }, WIDGET_SESSION);

    expect(channelsService.findByChannelId).toHaveBeenCalledWith('chan-web-1');
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
