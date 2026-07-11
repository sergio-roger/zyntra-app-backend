import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { Contact } from '@crm/entities/contact.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { ChannelsService } from '@/modules/channels/channels.service';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import { ChatGateway } from './chat.gateway';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { LeadCaptureDto } from './dto/lead-capture.dto';
import { MessageEncryptionService } from './services/message-encryption.service';

export const AGENT_RESPONSE_QUEUE = 'agent-response';

/** Fallback message when no agent is assigned to a channel. */
const FALLBACK_MESSAGE =
  'Gracias por tu mensaje. Un agente te responderá pronto.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly serviceToken: string;

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    @InjectRepository(Contact)
    private contactsRepo: Repository<Contact>,
    @InjectRepository(LifecycleStage)
    private stageRepo: Repository<LifecycleStage>,
    private readonly channelsService: ChannelsService,
    @InjectQueue(AGENT_RESPONSE_QUEUE)
    private agentQueue: Queue,
    private readonly chatGateway: ChatGateway,
    private readonly config: ConfigService,
    private readonly widgetSessionService: WidgetSessionService,
    private readonly messageEncryption: MessageEncryptionService,
    private readonly jwtService: JwtService,
  ) {
    this.serviceToken = config.get<string>('SERVICE_TOKEN', '');
  }

  /**
   * Short-lived token so the admin panel can authenticate the /chat socket.
   * The panel's own session is an httpOnly cookie (unreadable by JS) — this
   * mints a bearer token ChatGateway's agent path can verify, using the same
   * secret/payload shape (sub/business_id) as the staff login JWT.
   */
  signSocketToken(userId: string, businessId: string): string {
    return this.jwtService.sign(
      { sub: userId, business_id: businessId },
      { expiresIn: '15m' },
    );
  }

  // ---------------------------------------------------------------------------
  // Channel lookup — channelId always comes from a verified widget session or
  // the public_key exchange below, never from client-supplied request fields.
  // ---------------------------------------------------------------------------
  private async getActiveChannel(channelId: string): Promise<Channel> {
    const channel = await this.channelsService.findByChannelId(channelId);
    if (!channel || channel.status !== ChannelStatus.ACTIVE) {
      throw new NotFoundException('Canal no encontrado o inactivo');
    }
    return channel;
  }

  // ---------------------------------------------------------------------------
  // Main chat handler
  // ---------------------------------------------------------------------------
  async processChat(
    request: ChatRequestDto,
    widgetSession: WidgetSessionPayload,
    ip?: string,
  ): Promise<ChatResponseDto> {
    const { message, conversation_id } = request;

    // 1. Load the channel fresh (status/agent_id may have changed since the
    // session token was issued) — identity comes from the verified token.
    const channel = await this.getActiveChannel(widgetSession.channelId);
    const effectiveBusinessId = channel.businessId;

    // 2. Find or create conversation (keyed by channel + visitor fingerprint)
    const fingerprint = widgetSession.visitorFingerprint;
    let conversation = conversation_id
      ? await this.conversationModel.findById(conversation_id)
      : null;

    if (!conversation || conversation.business_id !== effectiveBusinessId) {
      if (!conversation_id) {
        // Check for an existing open conversation with same fingerprint+channel
        conversation = await this.conversationModel.findOne({
          business_id: effectiveBusinessId,
          channel_id: channel.id,
          'visitor.fingerprint': fingerprint,
          status: 'open',
        });
      }
    }

    if (!conversation) {
      conversation = await this.conversationModel.create({
        business_id: effectiveBusinessId,
        channel_id: channel.id,
        channel: 'web_chat',
        status: 'open',
        started_at: new Date(),
        last_message_at: new Date(),
        visitor: {
          fingerprint,
          ip_hash: ip ?? '',
          page_url: request.visitor?.page_url,
          referrer: request.visitor?.referrer,
          user_agent: request.visitor?.user_agent,
        },
      });
    }

    const conversationIdStr = conversation._id.toString();

    // 3. Persist user message
    await this.messageModel.create({
      conversation_id: conversationIdStr,
      role: 'user',
      content: message,
      channel: 'web_chat',
    });

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { last_message_at: new Date() },
    );

    const now = new Date().toISOString();

    // 4a. Agent assigned → enqueue job for agent-service
    if (channel.agentId) {
      const jobId = `${conversationIdStr}-${Date.now()}`;
      await this.agentQueue.add(
        'agent-response',
        {
          conversationId: conversationIdStr,
          channelId: channel.id,
          agentId: channel.agentId,
          businessId: effectiveBusinessId,
          jobId,
        },
        { jobId },
      );

      return {
        id: crypto.randomUUID(),
        conversation_id: conversationIdStr,
        message: '',
        pending: true,
        created_at: now,
      };
    }

    // 4b. No agent → return fallback message and mark conversation unattended
    await this.messageModel.create({
      conversation_id: conversationIdStr,
      role: 'assistant',
      content: FALLBACK_MESSAGE,
      channel: 'web_chat',
    });

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { status: 'open', last_message_at: new Date() },
    );

    this.chatGateway.emitNewMessage(
      effectiveBusinessId,
      conversationIdStr,
      FALLBACK_MESSAGE,
      'assistant',
    );

    return {
      id: crypto.randomUUID(),
      conversation_id: conversationIdStr,
      message: FALLBACK_MESSAGE,
      pending: false,
      created_at: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal agent callback (called by agent-service via HTTP)
  // ---------------------------------------------------------------------------
  async handleAgentCallback(payload: {
    conversationId: string;
    businessId: string;
    jobId: string;
    reply: string;
    model?: string;
    tokensUsed?: number;
    serviceToken: string;
  }) {
    if (!this.serviceToken || payload.serviceToken !== this.serviceToken) {
      throw new UnauthorizedException('Invalid service token');
    }

    const { conversationId, businessId, jobId, reply, model, tokensUsed } =
      payload;

    // Idempotency: skip if a message with this job_id already exists
    const existing = await this.messageModel.findOne({ job_id: jobId });
    if (existing) return { ok: true, duplicate: true };

    await this.messageModel.create({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      channel: 'web_chat',
      job_id: jobId,
      tokens_used: tokensUsed,
      model,
    });

    await this.conversationModel.updateOne(
      { _id: new Types.ObjectId(conversationId) },
      { last_message_at: new Date() },
    );

    this.chatGateway.emitNewMessage(
      businessId,
      conversationId,
      reply,
      'assistant',
    );

    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Conversation inbox (bandeja)
  // ---------------------------------------------------------------------------
  async getConversations(
    businessId: string,
    filters: { channelId?: string; status?: string } = {},
  ) {
    const query: Record<string, unknown> = { business_id: businessId };
    if (filters.channelId) query['channel_id'] = filters.channelId;
    if (filters.status) query['status'] = filters.status;

    const conversations = await this.conversationModel
      .find(query)
      .sort({ last_message_at: -1 })
      .limit(100)
      .lean();

    return conversations.map((c) => ({
      id: c._id.toString(),
      status: c.status,
      channel: c.channel,
      channelId: c.channel_id,
      startedAt: c.started_at?.toISOString(),
      lastMessageAt: c.last_message_at?.toISOString(),
      contactName: c.visitor?.name || 'Visitante anónimo',
    }));
  }

  async getConversationDetail(businessId: string, conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.business_id !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const messages = (await this.messageModel
      .find({ conversation_id: conversationId })
      .sort({ createdAt: 1 })
      .lean()) as unknown as {
      _id: Types.ObjectId;
      role: string;
      content: string;
      createdAt: Date;
    }[];

    return {
      id: conversation._id.toString(),
      status: conversation.status,
      channel: conversation.channel,
      channelId: conversation.channel_id,
      startedAt: conversation.started_at?.toISOString(),
      contactName: conversation.visitor?.name || 'Visitante anónimo',
      visitor: conversation.visitor,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content:
          m.role === 'agent'
            ? this.messageEncryption.decrypt(m.content)
            : m.content,
        createdAt: m.createdAt?.toISOString(),
      })),
    };
  }

  /**
   * Manual message from a human agent (dashboard), separate from the
   * AI/bot pipeline in processChat(). Content is encrypted at rest — only
   * 'agent' messages are, so getConversationDetail() decrypts selectively.
   */
  async sendAgentMessage(
    businessId: string,
    conversationId: string,
    content: string,
  ): Promise<{ id: string; createdAt: string }> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.business_id !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const encrypted = this.messageEncryption.encrypt(content);
    const message = (await this.messageModel.create({
      conversation_id: conversationId,
      role: 'agent',
      content: encrypted,
      channel: conversation.channel,
    })) as unknown as { _id: Types.ObjectId; createdAt: Date };

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { last_message_at: new Date() },
    );

    this.chatGateway.emitNewMessage(
      businessId,
      conversationId,
      content,
      'agent',
    );

    return {
      id: message._id.toString(),
      createdAt: message.createdAt.toISOString(),
    };
  }

  async updateConversationStatus(
    businessId: string,
    conversationId: string,
    status: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.business_id !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const allowed = ['open', 'closed', 'bot', 'human'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Estado inválido. Opciones: ${allowed.join(', ')}`,
      );
    }

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { status },
    );
    this.chatGateway.emitConversationStatusChanged(
      businessId,
      conversationId,
      status,
    );

    return { success: true, status };
  }

  // ---------------------------------------------------------------------------
  // Widget public_key -> session token exchange
  // ---------------------------------------------------------------------------
  async exchangeWidgetSession(
    publicKey: string,
    fp?: string,
    origin?: string,
    referer?: string,
  ) {
    if (!publicKey) {
      throw new BadRequestException('public_key es requerido');
    }

    // Resolves the channel and enforces allowed_origins in one step; throws
    // UnauthorizedException (generic) if the key is unknown/revoked or the
    // origin isn't allowlisted.
    const channel = await this.channelsService.validateOriginAndGetChannel(
      publicKey,
      origin,
      referer,
    );
    if (channel.status !== ChannelStatus.ACTIVE) {
      throw new NotFoundException('Este canal no está activo');
    }

    const visitorFingerprint = fp ?? crypto.randomUUID();
    const sessionToken = this.widgetSessionService.sign({
      businessId: channel.businessId,
      channelId: channel.id,
      visitorFingerprint,
    });

    const cfg = channel.config as Record<string, unknown>;
    return {
      sessionToken,
      expiresIn: WidgetSessionService.EXPIRES_IN_SECONDS,
      name: (cfg?.assistantName as string) ?? 'Asistente',
      theme: (cfg?.theme as string) ?? 'auto',
      position: (cfg?.position as string) ?? 'bottom-right',
      primaryColor: (cfg?.primaryColor as string) ?? '#6366f1',
      greeting: (cfg?.greeting as string) ?? '',
    };
  }

  async captureLead(dto: LeadCaptureDto, widgetSession: WidgetSessionPayload) {
    const { name, email, phone } = dto;
    if (!email && !phone) {
      throw new BadRequestException('Email o phone requerido');
    }

    const channel = await this.getActiveChannel(widgetSession.channelId);
    const businessId = channel.businessId;

    const existing = email
      ? await this.contactsRepo.findOne({ where: { businessId, email } })
      : await this.contactsRepo.findOne({ where: { businessId, phone } });

    if (existing) {
      existing.name = name;
      if (phone) existing.phone = phone;
      existing.lastActivityAt = new Date();
      await this.contactsRepo.save(existing);
      return {
        success: true,
        contact_id: existing.id,
        message: 'Lead actualizado',
      };
    }

    const defaultStage = await this.stageRepo.findOne({
      where: { business_id: businessId, is_default: true },
    });

    const contact = this.contactsRepo.create({
      businessId,
      name,
      email: email ?? null,
      phone: phone ?? null,
      source: ContactSource.WEB_CHAT,
      lifecycleStageId: defaultStage?.id ?? null,
      channelId: channel.id,
      lastActivityAt: new Date(),
    });

    await this.contactsRepo.save(contact);
    return { success: true, contact_id: contact.id, message: 'Lead capturado' };
  }
}
