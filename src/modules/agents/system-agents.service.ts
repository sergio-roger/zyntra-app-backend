import { Injectable } from '@nestjs/common';
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
}
