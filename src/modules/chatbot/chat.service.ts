import { ChannelsService } from '@/modules/channels/channels.service';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { ChannelStatus } from '@/modules/channels/enums/channel-status.enum';
import { ChatGateway } from '@/modules/chatbot/chat.gateway';
import {
  ChatRequestDto,
  ChatResponseDto,
} from '@/modules/chatbot/dto/chat.dto';
import { Conversation } from '@/modules/chatbot/entities/conversation.entity';
import { Message } from '@/modules/chatbot/entities/message.entity';
import { VisitorConversationMessage } from '@/modules/chatbot/interfaces/chat-gateway.interface';
import { MessageEncryptionService } from '@/modules/chatbot/services/message-encryption.service';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { UUID_RE } from '@common/constants/regex.constants';
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
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { FindOptionsWhere, Repository } from 'typeorm';

const SYSTEM_ASSIGNEE = { assignedTo: 'system', assignedToName: 'Sistema' };

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly serviceToken: string;

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly config: ConfigService,
    private readonly widgetSessionService: WidgetSessionService,
    private readonly messageEncryption: MessageEncryptionService,
    private readonly jwtService: JwtService,
    @InjectQueue('agent-response')
    private readonly agentResponseQueue: Queue,
  ) {
    this.serviceToken = config.get<string>('SERVICE_TOKEN', '');
  }

  /**
   * Shared lookup for conversation-scoped operations — resolves the
   * conversation and enforces business ownership in one place.
   */
  private async findConversationOrThrow(
    businessId: string,
    conversationId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (!conversation || conversation.businessId !== businessId) {
      throw new NotFoundException('Conversación no encontrada');
    }
    return conversation;
  }

  private shapeAssignee(
    c: Pick<Conversation, 'assignedTo' | 'assignedToName'>,
  ) {
    return c.assignedTo ? { id: c.assignedTo, name: c.assignedToName } : null;
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
        ...SYSTEM_ASSIGNEE,
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

    // 4. If the channel has an agent assigned, hand off to marketing-agents
    // via the agent-response queue — the reply comes back async through
    // POST /internal/agent-callback and reaches the widget over WebSocket.
    // No agent assigned → a human must reply manually from the inbox; no
    // canned message is injected here — that would fire on every single
    // user message with no dedup, and falsely imply an assistant/bot
    // replied when the channel has nothing configured to do so. A
    // configurable away/quick-reply message is a separate, not-yet-built
    // feature.
    if (channel.agentId) {
      const jobId = crypto.randomUUID();
      await this.agentResponseQueue.add(
        'generate-reply',
        {
          conversationId: conversationIdStr,
          channelId: channel.id,
          agentId: channel.agentId,
          businessId: effectiveBusinessId,
          jobId,
          // No forma parte del contrato original acordado para este job,
          // pero sin el texto el worker no puede generar una respuesta ni
          // hacer retrieval — ya lo tenemos en claro acá antes de cifrarlo.
          message,
        },
        { jobId, removeOnComplete: false, removeOnFail: false },
      );

      return {
        id: jobId,
        conversation_id: conversationIdStr,
        message: '',
        pending: true,
        created_at: new Date().toISOString(),
      };
    }

    return {
      id: crypto.randomUUID(),
      conversation_id: conversationIdStr,
      message: '',
      pending: false,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * History for the widget on reconnect. The conversationId alone is not
   * proof of ownership (it's stored client-side and could be replayed) —
   * ownership is enforced against the verified widget session (businessId,
   * channelId, visitorFingerprint), never against caller-supplied fields.
   */
  async getVisitorConversationHistory(
    widgetSession: WidgetSessionPayload,
    conversationId: string,
  ): Promise<VisitorConversationMessage[] | null> {
    if (!UUID_RE.test(conversationId)) return null;

    const conversation = await this.conversationRepo.findOneBy({
      id: conversationId,
    });
    if (
      !conversation ||
      conversation.businessId !== widgetSession.businessId ||
      conversation.channelId !== widgetSession.channelId ||
      conversation.visitor?.fingerprint !== widgetSession.visitorFingerprint
    ) {
      return null;
    }

    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: this.messageEncryption.decrypt(m.contentEncrypted),
    }));
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
      isRead: true,
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

    const conversationIds = conversations.map((c) => c.id);
    const { lastMessageByConversation, unreadCountByConversation } =
      await this.getConversationMessageSummaries(conversationIds);

    return conversations.map((c) => {
      const unreadCount = unreadCountByConversation.get(c.id) ?? 0;
      return {
        id: c.id,
        status: c.status,
        channel: c.channel,
        channelId: c.channelId,
        contactId: c.contactId ?? null,
        startedAt: c.startedAt?.toISOString(),
        lastMessageAt: c.lastMessageAt?.toISOString(),
        contactName: c.visitor?.name || 'Visitante anónimo',
        assignedTo: this.shapeAssignee(c),
        unread: unreadCount > 0,
        unreadCount,
        lastMessage: lastMessageByConversation.get(c.id) ?? null,
      };
    });
  }

  /**
   * Batch-fetches the last message content (decrypted) and unread visitor
   * message count per conversation, avoiding an N+1 query for the inbox list.
   */
  private async getConversationMessageSummaries(conversationIds: string[]) {
    const lastMessageByConversation = new Map<string, string>();
    const unreadCountByConversation = new Map<string, number>();
    if (conversationIds.length === 0) {
      return { lastMessageByConversation, unreadCountByConversation };
    }

    const lastMessages = await this.messageRepo
      .createQueryBuilder('m')
      .distinctOn(['m.conversation_id'])
      .where('m.conversation_id IN (:...ids)', { ids: conversationIds })
      .orderBy('m.conversation_id')
      .addOrderBy('m.created_at', 'DESC')
      .getMany();
    for (const m of lastMessages) {
      lastMessageByConversation.set(
        m.conversationId,
        this.messageEncryption.decrypt(m.contentEncrypted),
      );
    }

    const unreadCounts = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.conversation_id', 'conversationId')
      .addSelect('COUNT(*)', 'count')
      .where('m.conversation_id IN (:...ids)', { ids: conversationIds })
      .andWhere('m.role = :role', { role: 'user' })
      .andWhere('m.is_read = false')
      .groupBy('m.conversation_id')
      .getRawMany<{ conversationId: string; count: string }>();
    for (const row of unreadCounts) {
      unreadCountByConversation.set(row.conversationId, Number(row.count));
    }

    return { lastMessageByConversation, unreadCountByConversation };
  }

  async getConversationDetail(businessId: string, conversationId: string) {
    const isUuid = UUID_RE.test(conversationId);
    if (!isUuid) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    const unreadCount = messages.filter(
      (m) => m.role === 'user' && !m.isRead,
    ).length;

    return {
      id: conversation.id,
      status: conversation.status,
      channel: conversation.channel,
      channelId: conversation.channelId,
      contactId: conversation.contactId ?? null,
      startedAt: conversation.startedAt?.toISOString(),
      contactName: conversation.visitor?.name || 'Visitante anónimo',
      assignedTo: this.shapeAssignee(conversation),
      unread: unreadCount > 0,
      unreadCount,
      visitor: conversation.visitor,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: this.messageEncryption.decrypt(m.contentEncrypted),
        createdAt: m.createdAt?.toISOString(),
        isRead: m.isRead,
      })),
    };
  }

  /**
   * Marks every unread visitor message in a conversation as read. Called by
   * the inbox when an agent opens the thread, so the unread badge clears.
   */
  async markConversationAsRead(businessId: string, conversationId: string) {
    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

    await this.messageRepo.update(
      { conversationId: conversation.id, role: 'user', isRead: false },
      { isRead: true },
    );

    return { success: true };
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
    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

    const encrypted = this.messageEncryption.encrypt(content);
    const message = this.messageRepo.create({
      conversationId: conversationId,
      role: 'agent',
      contentEncrypted: encrypted,
      channel: conversation.channel,
      isRead: true,
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
    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

    await this.conversationRepo.update(conversation.id, {
      assignedTo: user.id,
      assignedToName: user.name,
    });

    return { success: true, assignedTo: { id: user.id, name: user.name } };
  }

  async unassignConversation(businessId: string, conversationId: string) {
    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

    await this.conversationRepo.update(conversation.id, SYSTEM_ASSIGNEE);

    return { success: true };
  }

  async updateConversationStatus(
    businessId: string,
    conversationId: string,
    status: string,
  ) {
    const conversation = await this.findConversationOrThrow(
      businessId,
      conversationId,
    );

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
        Mon: 'mon',
        Tue: 'tue',
        Wed: 'wed',
        Thu: 'thu',
        Fri: 'fri',
        Sat: 'sat',
        Sun: 'sun',
      };
      return {
        day: WEEKDAY_TO_DAY_KEY[weekday] ?? 'mon',
        time: `${hour}:${minute}`,
      };
    } catch {
      const now = new Date();
      const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
      const time = now.toTimeString().slice(0, 5);
      const WEEKDAY_TO_DAY_KEY: Record<string, string> = {
        Mon: 'mon',
        Tue: 'tue',
        Wed: 'wed',
        Thu: 'thu',
        Fri: 'fri',
        Sat: 'sat',
        Sun: 'sun',
      };
      return { day: WEEKDAY_TO_DAY_KEY[weekday] ?? 'mon', time };
    }
  }

  private isWithinBusinessHours(businessHours?: {
    is24x7?: boolean;
    timezone?: string;
    schedule?: Array<{
      day: string;
      enabled: boolean;
      from: string;
      to: string;
    }>;
  }): boolean {
    if (!businessHours) return true;
    if (businessHours.is24x7) return true;

    const { day, time } = this.getNowInTimezone(
      businessHours.timezone || 'UTC',
    );
    const entry = businessHours.schedule?.find((d) => d.day === day);
    if (!entry || !entry.enabled) return false;

    return time >= entry.from && time < entry.to;
  }

  getEffectiveWidgetStatus(cfg: {
    availabilityMode?: string;
    manualStatus?: string;
    businessHours?: {
      is24x7?: boolean;
      timezone?: string;
      schedule?: Array<{
        day: string;
        enabled: boolean;
        from: string;
        to: string;
      }>;
    };
  }): string {
    const mode = cfg?.availabilityMode ?? 'manual';
    const manual = cfg?.manualStatus ?? 'available';
    if (mode === 'manual') return manual;
    return this.isWithinBusinessHours(cfg?.businessHours)
      ? 'available'
      : 'offline';
  }
}
