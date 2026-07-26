import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';
import { SystemAgentCatalogItem } from '@/modules/agents/interfaces/system-agent-catalog-item.interface';
import { StorageClientService } from '@/storage-client/storage-client.service';

@Injectable()
export class SystemAgentsService {
  constructor(
    @InjectRepository(SystemAgent)
    private readonly systemAgentsRepo: Repository<SystemAgent>,
    private readonly storageClientService: StorageClientService,
  ) {}

  // Sin gating por plan todavía — catálogo igual para todos los negocios
  // (ver AI_AGENTS_MENU_REBUILD_PLAN.md, decisión explícita, deuda anotada).
  async findAll(): Promise<SystemAgentCatalogItem[]> {
    const systemAgents = await this.systemAgentsRepo.find({
      relations: ['category'],
      order: { category: { sortOrder: 'ASC' }, createdAt: 'ASC' },
    });
    return Promise.all(
      systemAgents.map((systemAgent) => this.toCatalogItem(systemAgent)),
    );
  }

  // Público: reusado por BusinessSystemAgentsService para enriquecer con
  // avatarUrl los System Agents importados por un negocio.
  async toCatalogItem(
    systemAgent: SystemAgent,
  ): Promise<SystemAgentCatalogItem> {
    const avatarUrl = await this.resolveAvatarUrl(systemAgent.avatarObjectKey);
    return { ...systemAgent, avatarUrl };
  }

  private resolveAvatarUrl(
    avatarObjectKey: string | null,
  ): Promise<string | null> {
    if (!avatarObjectKey) {
      return Promise.resolve(null);
    }
    return this.storageClientService.getSharedAssetSignedUrl(avatarObjectKey);
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
