import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatbotConfig,
  ChatbotTone,
  ChatbotLocale,
} from './entities/chatbot-config.entity';
import { Business } from '@auth/entities/business.entity';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(ChatbotConfig)
    private readonly configRepo: Repository<ChatbotConfig>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async getConfigByBusiness(businessId: string): Promise<ChatbotConfig> {
    const config = await this.configRepo.findOne({
      where: { business_id: businessId },
    });

    if (!config) {
      throw new NotFoundException('Chatbot configuration not found');
    }

    return config;
  }

  async getPublicConfig(businessId: string): Promise<ChatbotConfig> {
    const config = await this.configRepo.findOne({
      where: { business_id: businessId, is_active: true },
    });

    if (!config) {
      throw new NotFoundException('Chatbot not found or inactive');
    }

    return config;
  }

  async createConfig(businessId: string): Promise<ChatbotConfig> {
    const existing = await this.configRepo.findOne({
      where: { business_id: businessId },
    });

    if (existing) {
      return existing;
    }

    const config = this.configRepo.create({
      business_id: businessId,
      name: 'Asistente Zyntra',
      tone: ChatbotTone.FRIENDLY,
      welcome_message: '¡Hola! ¿En qué puedo ayudarte hoy?',
      locale: ChatbotLocale.ES,
      is_active: true,
      active_channels: ['web'],
      theme: {},
      faqs: [],
    });

    return this.configRepo.save(config);
  }

  async getOrCreateConfig(businessId: string): Promise<ChatbotConfig> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const existing = await this.configRepo.findOne({
      where: { business_id: businessId },
    });

    if (existing) {
      return existing;
    }

    this.logger.log(`Creating chatbot for business: ${businessId}`);

    const config = this.configRepo.create({
      business_id: businessId,
      name: 'Asistente Zyntra',
      tone: ChatbotTone.FRIENDLY,
      welcome_message: '¡Hola! ¿En qué puedo ayudarte hoy?',
      locale: ChatbotLocale.ES,
      is_active: true,
      active_channels: ['web'],
      theme: {},
      faqs: [],
    });

    return this.configRepo.save(config);
  }

  async updateConfig(
    businessId: string,
    updates: Partial<ChatbotConfig>,
  ): Promise<ChatbotConfig> {
    const config = await this.getConfigByBusiness(businessId);

    Object.assign(config, updates);

    return this.configRepo.save(config);
  }
}
