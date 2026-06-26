import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { ChatbotConfig } from './entities/chatbot-config.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactStage } from '@crm/enums/contact-stage.enum';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { AiService } from '@/modules/ai/ai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    @InjectRepository(ChatbotConfig)
    private configRepo: Repository<ChatbotConfig>,
    @InjectRepository(Contact)
    private contactsRepo: Repository<Contact>,
    @Inject(AiService)
    private aiService: AiService,
  ) {}

  async processChat(
    request: ChatRequestDto,
    ip?: string,
  ): Promise<ChatResponseDto> {
    const { message, business_id, conversation_id } = request;

    if (!business_id) {
      throw new HttpException(
        'business_id es requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const config = await this.configRepo.findOne({
      where: { business_id },
    });

    if (!config) {
      throw new NotFoundException('Chatbot no disponible');
    }

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
        visitor: { ip_hash: ip || '', user_agent: '' },
      });
    }

    const conversationIdStr = conversation._id.toString();

    const recentMessages = await this.messageModel
      .find({ conversation_id: conversationIdStr })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const conversationHistory = [...recentMessages].reverse().map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const toneInstructions: Record<string, string> = {
      formal: 'Usa un tono formal y profesional. Sé respetuoso y directo.',
      friendly: 'Usa un tono amigable y cercano. Sé cálido y accesible.',
      professional: 'Usa un tono profesional pero no frío. Sé claro y efisien.',
      casual: 'Usa un tono casual y relajado. Sé natural y divertido.',
    };

    const faqsSection = config.faqs?.length
      ? `\n\nFAQs disponibles:\n${config.faqs
          .filter((f) => f.question && f.answer)
          .map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`)
          .join('\n')}`
      : '';

    const systemMessage = `${config.system_prompt_extra || ''}\n\n${
      toneInstructions[config.tone as string] || toneInstructions.friendly
    }\n\nNombre del negocio: ${config.name}\nIdioma: ${config.locale}${faqsSection}`;

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      { role: 'system', content: systemMessage },
      ...conversationHistory.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const startTime = Date.now();

    try {
      const aiResponse = await this.aiService.chat({ messages });
      const reply =
        aiResponse.choices[0]?.message?.content ||
        'Lo siento, no pude procesar tu solicitud.';

      const latencyMs = Date.now() - startTime;

      await this.messageModel.create({
        conversation_id: conversationIdStr,
        role: 'user',
        content: message,
        channel: 'web',
      });

      await this.messageModel.create({
        conversation_id: conversationIdStr,
        role: 'assistant',
        content: reply,
        tokens_used: aiResponse.usage?.total_tokens,
        latency_ms: latencyMs,
        model: aiResponse.model,
        channel: 'web',
      });

      await this.conversationModel.updateOne(
        { _id: conversation._id },
        { last_message_at: new Date() },
      );

      return {
        id: crypto.randomUUID(),
        conversation_id: conversationIdStr,
        message: reply,
        created_at: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      const msg =
        err.response?.data?.error?.message ?? 'Error al procesar mensaje';
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
  }

  async getPublicConfig(businessId: string) {
    const config = await this.configRepo.findOne({
      where: { business_id: businessId },
      select: [
        'name',
        'welcome_message',
        'tone',
        'locale',
        'theme',
        'is_active',
      ],
    });

    if (!config) {
      throw new NotFoundException('Chatbot no encontrado');
    }

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
      throw new HttpException(
        'Email o phone requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

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

    const contact = this.contactsRepo.create({
      businessId,
      name,
      email: email || null,
      phone: phone || null,
      source: ContactSource.CHATBOT,
      stage: ContactStage.LEAD,
      lastActivityAt: new Date(),
    });

    await this.contactsRepo.save(contact);

    return { success: true, contact_id: contact.id, message: 'Lead capturado' };
  }

  async getConversations(businessId: string) {
    const conversations = await this.conversationModel
      .find({ business_id: businessId })
      .sort({ last_message_at: -1 })
      .limit(50)
      .lean();

    return conversations.map((c) => ({
      id: c._id.toString(),
      status: c.status,
      channel: c.channel,
      started_at: c.started_at ? c.started_at.toISOString() : undefined,
      last_message_at: c.last_message_at
        ? c.last_message_at.toISOString()
        : undefined,
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
      started_at: conversation.started_at
        ? conversation.started_at.toISOString()
        : undefined,
      visitor: conversation.visitor,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        created_at: m.createdAt ? m.createdAt.toISOString() : undefined,
      })),
    };
  }
}
