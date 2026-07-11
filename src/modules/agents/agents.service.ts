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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,

    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,

    private readonly aiService: AiService,
  ) {}

  async create(businessId: string, dto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepo.create({
      business_id: businessId,
      name: dto.name,
      model: dto.model ?? 'openai/gpt-4o-mini',
      system_prompt: dto.system_prompt,
      temperature: dto.temperature ?? 0.7,
      tools: dto.tools ?? [],
      is_active: dto.is_active ?? true,
    });
    return this.agentRepo.save(agent);
  }

  async findAll(businessId: string): Promise<Agent[]> {
    return this.agentRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(businessId: string, agentId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId, business_id: businessId },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  async update(
    businessId: string,
    agentId: string,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOne(businessId, agentId);
    Object.assign(agent, dto);
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

    await this.agentRepo.remove(agent);
    return { success: true };
  }

  async sandboxTest(
    businessId: string,
    agentId: string,
    message: string,
  ): Promise<{ reply: string; model: string; tokens?: number }> {
    const agent = await this.findOne(businessId, agentId);

    const response = await this.aiService.chat({
      model: agent.model,
      temperature: agent.temperature,
      messages: [
        { role: 'system', content: agent.system_prompt },
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

  assertOwnership(requestBusinessId: string, paramBusinessId: string) {
    if (requestBusinessId !== paramBusinessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }
}
