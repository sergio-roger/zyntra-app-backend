import {
  BadRequestException,
  Injectable,
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
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { ChatbotConfig } from './entities/chatbot-config.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { ChatGateway } from './chat.gateway';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

export const AGENT_RESPONSE_QUEUE = 'agent-response';

/** Fallback message when no agent is assigned to a channel. */
const FALLBACK_MESSAGE =
  'Gracias por tu mensaje. Un agente te responderá pronto.';

@Injectable()
export class ChatService {
  private readonly serviceToken: string;

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    @InjectRepository(ChatbotConfig)
    private configRepo: Repository<ChatbotConfig>,
    @InjectRepository(Contact)
    private contactsRepo: Repository<Contact>,
    @InjectRepository(LifecycleStage)
    private stageRepo: Repository<LifecycleStage>,
    @InjectRepository(Channel)
    private channelRepo: Repository<Channel>,
    @InjectQueue(AGENT_RESPONSE_QUEUE)
    private agentQueue: Queue,
    private readonly chatGateway: ChatGateway,
    private readonly config: ConfigService,
  ) {
    this.serviceToken = config.get<string>('SERVICE_TOKEN', '');
  }

  // ---------------------------------------------------------------------------
  // Main chat handler (refactored Phase 4)
  // ---------------------------------------------------------------------------
  async processChat(
    request: ChatRequestDto,
    ip?: string,
  ): Promise<ChatResponseDto> {
    const { message, business_id, conversation_id } = request;

    if (!business_id) {
      throw new BadRequestException('business_id es requerido');
    }

    // 1. Resolve the web_chat channel for this business
    const channel = await this.channelRepo.findOne({
      where: { business_id, channelType: { key: 'web_chat' } },
      relations: ['channelType'],
    });

    // Fall back to legacy behaviour (no channel yet) — use chatbot_config
    if (!channel) {
      return this.legacyProcessChat(request, ip);
    }

    // 2. Find or create conversation (keyed by channel + visitor fingerprint)
    const fingerprint = request.visitor?.fingerprint ?? ip ?? 'anonymous';
    let conversation = conversation_id
      ? await this.conversationModel.findById(conversation_id)
      : null;

    if (!conversation || conversation.business_id !== business_id) {
      if (!conversation_id) {
        // Check for an existing open conversation with same fingerprint+channel
        conversation = await this.conversationModel.findOne({
          business_id,
          channel_id: channel.id,
          'visitor.fingerprint': fingerprint,
          status: 'open',
        });
      }
    }

    if (!conversation) {
      conversation = await this.conversationModel.create({
        business_id,
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
    if (channel.agent_id) {
      const jobId = `${conversationIdStr}-${Date.now()}`;
      await this.agentQueue.add(
        'agent-response',
        {
          conversationId: conversationIdStr,
          channelId: channel.id,
          agentId: channel.agent_id,
          businessId: business_id,
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
      business_id,
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

    const { conversationId, businessId, jobId, reply, model, tokensUsed } = payload;

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

    this.chatGateway.emitNewMessage(businessId, conversationId, reply, 'assistant');

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
      channel_id: c.channel_id,
      started_at: c.started_at?.toISOString(),
      last_message_at: c.last_message_at?.toISOString(),
      contact_name: c.visitor?.name || 'Visitante anónimo',
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
      channel_id: conversation.channel_id,
      started_at: conversation.started_at?.toISOString(),
      visitor: conversation.visitor,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        created_at: m.createdAt?.toISOString(),
      })),
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
      throw new BadRequestException(`Estado inválido. Opciones: ${allowed.join(', ')}`);
    }

    await this.conversationModel.updateOne({ _id: conversation._id }, { status });
    this.chatGateway.emitConversationStatusChanged(
      businessId,
      conversationId,
      status,
    );

    return { success: true, status };
  }

  // ---------------------------------------------------------------------------
  // Legacy path (no channel configured) — preserves original behaviour
  // ---------------------------------------------------------------------------
  private async legacyProcessChat(
    request: ChatRequestDto,
    ip?: string,
  ): Promise<ChatResponseDto> {
    const { message, business_id, conversation_id } = request;

    const config = await this.configRepo.findOne({ where: { business_id } });
    if (!config) throw new NotFoundException('Chatbot no disponible');

    let conversation: ConversationDocument | null = null;
    if (conversation_id) {
      conversation = await this.conversationModel.findById(conversation_id);
    }

    if (!conversation) {
      conversation = await this.conversationModel.create({
        business_id,
        channel: 'web',
        status: 'open',
        started_at: new Date(),
        last_message_at: new Date(),
        visitor: { ip_hash: ip ?? '', user_agent: '' },
      });
    }

    const conversationIdStr = conversation._id.toString();
    const recentMessages = await this.messageModel
      .find({ conversation_id: conversationIdStr })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const history = [...recentMessages].reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const toneMap: Record<string, string> = {
      formal: 'Usa un tono formal y profesional.',
      friendly: 'Usa un tono amigable y cercano.',
      professional: 'Usa un tono profesional pero no frío.',
      casual: 'Usa un tono casual y relajado.',
    };

    const faqs = config.faqs?.length
      ? `\n\nFAQs:\n${config.faqs.map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`).join('\n')}`
      : '';

    const systemPrompt = `${config.system_prompt_extra ?? ''}\n\n${toneMap[config.tone as string] ?? toneMap.friendly}\n\nNombre: ${config.name}\nIdioma: ${config.locale}${faqs}`;

    // Lazy import to avoid circular dependency if AiModule not available in this path
    const { AiService } = await import('../ai/ai.service');
    const aiSvc: InstanceType<typeof AiService> = (this as unknown as { aiService?: unknown }).aiService as InstanceType<typeof AiService>;

    const aiResponse = await aiSvc.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
    });

    const reply = aiResponse.choices[0]?.message?.content ?? 'Lo siento, no pude procesar tu solicitud.';
    const latencyMs = 0;

    await this.messageModel.create({ conversation_id: conversationIdStr, role: 'user', content: message, channel: 'web' });
    await this.messageModel.create({
      conversation_id: conversationIdStr,
      role: 'assistant',
      content: reply,
      tokens_used: aiResponse.usage?.total_tokens,
      latency_ms: latencyMs,
      model: aiResponse.model,
      channel: 'web',
    });
    await this.conversationModel.updateOne({ _id: conversation._id }, { last_message_at: new Date() });

    return {
      id: crypto.randomUUID(),
      conversation_id: conversationIdStr,
      message: reply,
      pending: false,
      created_at: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Existing helpers (kept for backward compat)
  // ---------------------------------------------------------------------------
  async getPublicConfig(businessId: string) {
    const config = await this.configRepo.findOne({
      where: { business_id: businessId },
      select: ['name', 'welcome_message', 'tone', 'locale', 'theme', 'is_active'],
    });
    if (!config) throw new NotFoundException('Chatbot no encontrado');
    return config;
  }

  async captureLead(dto: {
    business_id: string;
    name: string;
    email?: string;
    phone?: string;
    conversation_id?: string;
  }) {
    const { business_id: businessId, name, email, phone } = dto;
    if (!email && !phone) {
      throw new BadRequestException('Email o phone requerido');
    }

    const existing = email
      ? await this.contactsRepo.findOne({ where: { businessId, email } })
      : await this.contactsRepo.findOne({ where: { businessId, phone } });

    if (existing) {
      existing.name = name;
      if (phone) existing.phone = phone;
      existing.lastActivityAt = new Date();
      await this.contactsRepo.save(existing);
      return { success: true, contact_id: existing.id, message: 'Lead actualizado' };
    }

    const defaultStage = await this.stageRepo.findOne({
      where: { business_id: businessId, is_default: true },
    });

    const contact = this.contactsRepo.create({
      businessId,
      name,
      email: email ?? null,
      phone: phone ?? null,
      source: ContactSource.CHATBOT,
      lifecycleStageId: defaultStage?.id ?? null,
      lastActivityAt: new Date(),
    });

    await this.contactsRepo.save(contact);
    return { success: true, contact_id: contact.id, message: 'Lead capturado' };
  }
}
