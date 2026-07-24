import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';

@Injectable()
export class SystemAgentsService {
  constructor(
    @InjectRepository(SystemAgent)
    private readonly systemAgentsRepo: Repository<SystemAgent>,
  ) {}

  // Sin gating por plan todavía — catálogo igual para todos los negocios
  // (ver AI_AGENTS_MENU_REBUILD_PLAN.md, decisión explícita, deuda anotada).
  findAll(): Promise<SystemAgent[]> {
    return this.systemAgentsRepo.find({
      relations: ['category'],
      order: { category: { sortOrder: 'ASC' }, createdAt: 'ASC' },
    });
  }

  // instructions/model del System Agent siguen fijos en el repo Mastra —
  // acá solo se expone `tools`, lo único que el catálogo controla.
  async getRuntimeConfig(systemAgentId: string) {
    const systemAgent = await this.systemAgentsRepo.findOne({
      where: { id: systemAgentId },
    });
    if (!systemAgent) {
      throw new NotFoundException('System Agent no encontrado');
    }
    return { tools: systemAgent.tools };
  }
}
