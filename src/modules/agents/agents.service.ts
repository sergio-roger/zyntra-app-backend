import { CreateAgentDto } from '@/modules/agents/dto/create-agent.dto';
import { UpdateAgentDto } from '@/modules/agents/dto/update-agent.dto';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { AiService } from '@ai/ai.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

export interface AgentTestSource {
  documentId: string;
  fileName: string;
  snippet?: string;
  score?: number;
}

export interface AgentTestResult {
  reply: string;
  model: string;
  tokens?: number;
  // Poblado a partir de la Fase C, cuando marketing-agents devuelva las
  // fuentes de la base de conocimiento usadas para responder. Por ahora
  // siempre queda undefined — el contrato ya está preparado.
  sources?: AgentTestSource[];
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,

    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,

    @InjectQueue('kb-deletion')
    private readonly kbDeletionQueue: Queue,

    private readonly aiService: AiService,
  ) {}

  async create(businessId: string, dto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepo.create({
      businessId,
      name: dto.name,
      model: dto.model ?? 'openai/gpt-4o-mini',
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature ?? 0.7,
      tools: dto.tools ?? [],
      isActive: dto.isActive ?? true,
      tone: dto.tone,
      locale: dto.locale,
      maxTokens: dto.maxTokens ?? 1024,
      voiceConfig: dto.voiceConfig,
      memoryConfig: dto.memoryConfig,
    });
    const saved = await this.agentRepo.save(agent);

    // knowledgeCollection no es editable por el usuario: se autogenera acá,
    // recién cuando ya existe un id (columna Qdrant que va a usar la Fase C).
    saved.knowledgeCollection = `kb_${saved.id}`;
    return this.agentRepo.save(saved);
  }

  async findAll(businessId: string): Promise<Agent[]> {
    return this.agentRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(businessId: string, agentId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId, businessId },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  // Variante sin scope de negocio, solo para llamadas internas
  // service-to-service (protegidas por SERVICE_TOKEN, no por JWT de usuario).
  async findById(agentId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  async update(
    businessId: string,
    agentId: string,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOne(businessId, agentId);
    if (dto.name !== undefined) agent.name = dto.name;
    if (dto.model !== undefined) agent.model = dto.model;
    if (dto.systemPrompt !== undefined) agent.systemPrompt = dto.systemPrompt;
    if (dto.temperature !== undefined) agent.temperature = dto.temperature;
    if (dto.tools !== undefined) agent.tools = dto.tools;
    if (dto.isActive !== undefined) agent.isActive = dto.isActive;
    if (dto.tone !== undefined) agent.tone = dto.tone;
    if (dto.locale !== undefined) agent.locale = dto.locale;
    if (dto.maxTokens !== undefined) agent.maxTokens = dto.maxTokens;
    if (dto.voiceConfig !== undefined) agent.voiceConfig = dto.voiceConfig;
    if (dto.memoryConfig !== undefined) agent.memoryConfig = dto.memoryConfig;
    return this.agentRepo.save(agent);
  }

  async remove(
    businessId: string,
    agentId: string,
  ): Promise<{ success: boolean }> {
    const agent = await this.findOne(businessId, agentId);

    // Block deletion if agent is assigned to at least one active channel
    const assignedChannel = await this.channelRepo.findOne({
      where: { businessId: businessId, agentId: agentId },
    });
    if (assignedChannel) {
      throw new ConflictException(
        'Desasigna el agente de sus canales antes de eliminarlo',
      );
    }

    // knowledge_documents del agente se cascadean solos a nivel de DB (FK
    // ON DELETE CASCADE), pero eso no dispara ningún código de aplicación —
    // hay que dropear la colección entera de Qdrant acá explícitamente.
    if (agent.knowledgeCollection) {
      await this.kbDeletionQueue.add('delete-agent-collection', {
        scope: 'agent',
        knowledgeCollection: agent.knowledgeCollection,
      });
    }

    await this.agentRepo.remove(agent);
    return { success: true };
  }

  async sandboxTest(
    businessId: string,
    agentId: string,
    message: string,
  ): Promise<AgentTestResult> {
    const agent = await this.findOne(businessId, agentId);

    const response = await this.aiService.chat({
      model: agent.model,
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const reply =
      response.choices[0]?.message?.content ?? 'Sin respuesta del modelo';

    return {
      reply,
      model: response.model,
      tokens: response.usage?.total_tokens,
    };
  }

  async getRuntimeConfig(agentId: string) {
    const agent = await this.findById(agentId);
    return {
      systemPrompt: agent.systemPrompt,
      tone: agent.tone,
      locale: agent.locale,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      tools: agent.tools,
      knowledgeCollection: agent.knowledgeCollection,
      voice: agent.voiceConfig,
      memory: agent.memoryConfig,
    };
  }

  assertOwnership(requestBusinessId: string, paramBusinessId: string) {
    if (requestBusinessId !== paramBusinessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }
}
