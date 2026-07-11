import { ChannelsService } from '@/modules/channels/channels.service';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { UUID_RE } from '@common/constants/regex.constants';
import { Contact } from '@crm/entities/contact.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { FindOptionsWhere, Repository } from 'typeorm';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import { ChatGateway } from './chat.gateway';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { LeadCaptureDto } from './dto/lead-capture.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageEncryptionService } from './services/message-encryption.service';

export const AGENT_RESPONSE_QUEUE = 'agent-response';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly serviceToken: string;

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Contact)
    private contactsRepo: Repository<Contact>,
    @InjectRepository(LifecycleStage)
    private stageRepo: Repository<LifecycleStage>,
    private readonly channelsService: ChannelsService,
    @InjectQueue(AGENT_RESPONSE_QUEUE)
    private agentQueue: Queue,
    @Inject(forwardRef(() => ChatGateway))
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
    const isUuid = (val: string) => UUID_RE.test(val);

    let conversation =
      conversation_id && isUuid(conversation_id)
        ? await this.conversationRepo.findOneBy({ id: conversation_id })
        : null;

    if (!conversation || conversation.businessId !== effectiveBusinessId) {
      if (!conversation_id) {
        // Check for an existing open conversation with same fingerprint+channel
        conversation = await this.conversationRepo
          .createQueryBuilder('c')
          .where('c.businessId = :businessId', {
            businessId: effectiveBusinessId,
          })
          .andWhere('c.channelId = :channelId', { channelId: channel.id })
          .andWhere("c.visitor->>'fingerprint' = :fingerprint", { fingerprint })
          .andWhere('c.status = :status', { status: 'open' })
          .getOne();
      }
    }

    if (!conversation) {
      conversation = this.conversationRepo.create({
        businessId: effectiveBusinessId,
        channelId: channel.id,
        channel: 'web_chat',
        status: 'open',
        startedAt: new Date(),
        lastMessageAt: new Date(),
        assignedTo: 'system',
        assignedToName: 'Sistema',
        visitor: {
          fingerprint,
          ipHash: ip ?? '',
          pageUrl: request.visitor?.page_url,
          referrer: request.visitor?.referrer,
          userAgent: request.visitor?.user_agent,
        },
      });
      await this.conversationRepo.save(conversation);
    }

    const conversationIdStr = conversation.id;

    // 3. Persist user message
    const encryptedUserMsg = this.messageEncryption.encrypt(message);
    const userMsg = this.messageRepo.create({
      conversationId: conversationIdStr,
      role: 'user',
      contentEncrypted: encryptedUserMsg,
      channel: 'web_chat',
    });
    await this.messageRepo.save(userMsg);

    await this.conversationRepo.update(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageRole: 'user',
    });

    this.chatGateway.emitNewMessage(
      effectiveBusinessId,
      conversationIdStr,
      message,
      'user',
    );

    const now = new Date().toISOString();

    // 4a. Agent assigned to the conversation → enqueue job for agent-service
    if (channel.agentId && conversation.assignedTo === channel.agentId) {
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

    // 4b. No agent assigned → wait for a human to reply, no automatic message.
    return {
      id: crypto.randomUUID(),
      conversation_id: conversationIdStr,
      message: '',
      pending: true,
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
    const existing = await this.messageRepo.findOneBy({ jobId });
    if (existing) return { ok: true, duplicate: true };

    const encryptedReply = this.messageEncryption.encrypt(reply);
    const msg = this.messageRepo.create({
      conversationId,
      role: 'assistant',
      contentEncrypted: encryptedReply,
      channel: 'web_chat',
      jobId,
      tokensUsed,
      model,
    });
    await this.messageRepo.save(msg);

    await this.conversationRepo.update(conversationId, {
      lastMessageAt: new Date(),
      lastMessageRole: 'assistant',
    });

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
    filters: {
      channelId?: string;
      status?: string;
      assignedToUserId?: string;
      unreadOnly?: boolean;
    } = {},
  ) {
    const where: FindOptionsWhere<Conversation> = { businessId };
    if (filters.channelId) where.channelId = filters.channelId;
    if (filters.status) where.status = filters.status;
    if (filters.assignedToUserId) where.assignedTo = filters.assignedToUserId;
    if (filters.unreadOnly) where.lastMessageRole = 'user';

    const conversations = await this.conversationRepo.find({
      where,
      order: { lastMessageAt: 'DESC' },
      take: 100,
    });

    return conversations.map((c) => ({
      id: c.id,
      status: c.status,
      channel: c.channel,
      channelId: c.channelId,
      contactId: c.contactId ?? null,
      startedAt: c.startedAt?.toISOString(),
      lastMessageAt: c.lastMessageAt?.toISOString(),
      contactName: c.visitor?.name || 'Visitante anónimo',
      assignedTo: c.assignedTo
        ? { id: c.assignedTo, name: c.assignedToName }
        : null,
      unread: c.lastMessageRole === 'user',
    }));
  }

  async getConversationDetail(businessId: string, conversationId: string) {
    const isUuid = UUID_RE.test(conversationId);
    if (!isUuid) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return {
      id: conversation.id,
      status: conversation.status,
      channel: conversation.channel,
      channelId: conversation.channelId,
      contactId: conversation.contactId ?? null,
      startedAt: conversation.startedAt?.toISOString(),
      contactName: conversation.visitor?.name || 'Visitante anónimo',
      assignedTo: conversation.assignedTo
        ? { id: conversation.assignedTo, name: conversation.assignedToName }
        : null,
      unread: conversation.lastMessageRole === 'user',
      visitor: conversation.visitor,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: this.messageEncryption.decrypt(m.contentEncrypted),
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
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const encrypted = this.messageEncryption.encrypt(content);
    const message = this.messageRepo.create({
      conversationId: conversationId,
      role: 'agent',
      contentEncrypted: encrypted,
      channel: conversation.channel,
    });
    await this.messageRepo.save(message);

    await this.conversationRepo.update(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageRole: 'agent',
    });

    this.chatGateway.emitNewMessage(
      businessId,
      conversationId,
      content,
      'agent',
    );

    return {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /** Agent self-assign ("claim") / release, backing the "Míos" inbox tab. */
  async assignConversationToSelf(
    businessId: string,
    conversationId: string,
    user: { id: string; name: string },
  ) {
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    await this.conversationRepo.update(conversation.id, {
      assignedTo: user.id,
      assignedToName: user.name,
    });

    return { success: true, assignedTo: { id: user.id, name: user.name } };
  }

  async unassignConversation(businessId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    await this.conversationRepo.update(conversation.id, {
      assignedTo: 'system',
      assignedToName: 'Sistema',
    });

    return { success: true };
  }

  async updateConversationStatus(
    businessId: string,
    conversationId: string,
    status: string,
  ) {
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const allowed = ['open', 'closed', 'bot', 'human'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Estado inválido. Opciones: ${allowed.join(', ')}`,
      );
    }

    await this.conversationRepo.update(conversation.id, { status });
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
    const status = this.getEffectiveWidgetStatus(cfg);
    return {
      sessionToken,
      expiresIn: WidgetSessionService.EXPIRES_IN_SECONDS,
      name: (cfg?.assistantName as string) ?? 'Asistente',
      theme: (cfg?.theme as string) ?? 'auto',
      position: (cfg?.position as string) ?? 'bottom-right',
      primaryColor: (cfg?.primaryColor as string) ?? '#6366f1',
      greeting: (cfg?.greeting as string) ?? '',
      status,
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

    let contactId: string;
    let message: string;

    if (existing) {
      existing.name = name;
      if (phone) existing.phone = phone;
      existing.lastActivityAt = new Date();
      await this.contactsRepo.save(existing);
      contactId = existing.id;
      message = 'Lead actualizado';
    } else {
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
      contactId = contact.id;
      message = 'Lead capturado';
    }

    if (dto.conversation_id) {
      await this.conversationRepo.update(
        { id: dto.conversation_id, businessId },
        { contactId },
      );
    }

    return {
      captured: true,
      contactId,
      message,
    };
  }

  private getNowInTimezone(timezone: string): { day: string; time: string } {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());

      const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
      const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
      const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

      const WEEKDAY_TO_DAY_KEY: Record<string, string> = {
        Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun'
      };
      return { day: WEEKDAY_TO_DAY_KEY[weekday] ?? 'mon', time: `${hour}:${minute}` };
    } catch {
      const now = new Date();
      const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
      const time = now.toTimeString().slice(0, 5);
      const WEEKDAY_TO_DAY_KEY: Record<string, string> = {
        Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun'
      };
      return { day: WEEKDAY_TO_DAY_KEY[weekday] ?? 'mon', time };
    }
  }

  private isWithinBusinessHours(businessHours: any): boolean {
    if (!businessHours) return true;
    if (businessHours.is24x7) return true;

    const { day, time } = this.getNowInTimezone(businessHours.timezone || 'UTC');
    const entry = businessHours.schedule?.find((d: any) => d.day === day);
    if (!entry || !entry.enabled) return false;

    return time >= entry.from && time < entry.to;
  }

  getEffectiveWidgetStatus(cfg: any): string {
    const mode = cfg?.availabilityMode ?? 'manual';
    const manual = cfg?.manualStatus ?? 'available';
    if (mode === 'manual') return manual;
    return this.isWithinBusinessHours(cfg?.businessHours) ? 'available' : 'offline';
  }
}
