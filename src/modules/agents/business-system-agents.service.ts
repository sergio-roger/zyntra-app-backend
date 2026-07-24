import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';
import { BusinessSystemAgent } from '@/modules/agents/entities/business-system-agent.entity';
import { SystemAgentsService } from '@/modules/agents/system-agents.service';
import { ImportedSystemAgentResponse } from '@/modules/agents/interfaces/imported-system-agent-response.interface';

@Injectable()
export class BusinessSystemAgentsService {
  constructor(
    @InjectRepository(SystemAgent)
    private readonly systemAgentsRepo: Repository<SystemAgent>,
    @InjectRepository(BusinessSystemAgent)
    private readonly businessSystemAgentsRepo: Repository<BusinessSystemAgent>,
    private readonly systemAgentsService: SystemAgentsService,
  ) {}

  async findImported(
    businessId: string,
  ): Promise<ImportedSystemAgentResponse[]> {
    const imported = await this.businessSystemAgentsRepo.find({
      where: { businessId },
      relations: ['systemAgent', 'systemAgent.category'],
      order: { importedAt: 'DESC' },
    });
    return Promise.all(imported.map((row) => this.toResponse(row)));
  }

  async importAgent(
    businessId: string,
    systemAgentId: string,
  ): Promise<ImportedSystemAgentResponse> {
    const systemAgent = await this.systemAgentsRepo.findOne({
      where: { id: systemAgentId },
      relations: ['category'],
    });
    if (!systemAgent) {
      throw new NotFoundException('System Agent no encontrado');
    }
    if (systemAgent.status !== 'active') {
      throw new BadRequestException(
        'Este agente todavía no está disponible para importar',
      );
    }

    const alreadyImported = await this.businessSystemAgentsRepo.findOne({
      where: { businessId, systemAgentId },
      relations: ['systemAgent', 'systemAgent.category'],
    });
    if (alreadyImported) {
      return this.toResponse(alreadyImported);
    }

    const created = this.businessSystemAgentsRepo.create({
      businessId,
      systemAgentId,
    });
    const saved = await this.businessSystemAgentsRepo.save(created);
    return this.toResponse({ ...saved, systemAgent });
  }

  private async toResponse(
    row: BusinessSystemAgent,
  ): Promise<ImportedSystemAgentResponse> {
    return {
      importedAt: row.importedAt,
      systemAgent: await this.systemAgentsService.toCatalogItem(
        row.systemAgent,
      ),
    };
  }
}
