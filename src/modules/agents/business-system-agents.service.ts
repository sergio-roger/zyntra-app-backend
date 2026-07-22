import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';
import { BusinessSystemAgent } from '@/modules/agents/entities/business-system-agent.entity';

@Injectable()
export class BusinessSystemAgentsService {
  constructor(
    @InjectRepository(SystemAgent)
    private readonly systemAgentsRepo: Repository<SystemAgent>,
    @InjectRepository(BusinessSystemAgent)
    private readonly businessSystemAgentsRepo: Repository<BusinessSystemAgent>,
  ) {}

  findImported(businessId: string): Promise<BusinessSystemAgent[]> {
    return this.businessSystemAgentsRepo.find({
      where: { businessId },
      relations: ['systemAgent', 'systemAgent.category'],
      order: { importedAt: 'DESC' },
    });
  }

  async importAgent(
    businessId: string,
    systemAgentId: string,
  ): Promise<BusinessSystemAgent> {
    const systemAgent = await this.systemAgentsRepo.findOne({
      where: { id: systemAgentId },
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
      return alreadyImported;
    }

    const created = this.businessSystemAgentsRepo.create({
      businessId,
      systemAgentId,
    });
    const saved = await this.businessSystemAgentsRepo.save(created);
    return { ...saved, systemAgent };
  }
}
