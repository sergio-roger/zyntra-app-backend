import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemAgentCatalogItem } from '@/modules/agents/interfaces/system-agent-catalog-item.interface';
import { BusinessSystemAgentsService } from './business-system-agents.service';
import { SystemAgentsService } from './system-agents.service';
import { SystemAgent } from './entities/system-agent.entity';
import { BusinessSystemAgent } from './entities/business-system-agent.entity';

const BUSINESS_ID = 'business-uuid';
const OTHER_BUSINESS_ID = 'other-business-uuid';

const makeSystemAgent = (
  status: 'active' | 'coming_soon' = 'active',
): SystemAgent =>
  ({
    id: 'agent-uuid',
    slug: 'marketing-strategist',
    name: 'Marketing Strategist',
    role: 'marketing_strategist',
    status,
  }) as SystemAgent;

describe('BusinessSystemAgentsService', () => {
  let service: BusinessSystemAgentsService;

  const systemAgentsRepo = { findOne: jest.fn() };
  const businessSystemAgentsRepo = {
    findOne: jest.fn(),
    find: jest.fn<Promise<unknown>, [{ where: { businessId: string } }]>(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(),
  };
  const systemAgentsService = {
    toCatalogItem: jest.fn((agent: SystemAgent) =>
      Promise.resolve(agent as unknown as SystemAgentCatalogItem),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessSystemAgentsService,
        {
          provide: getRepositoryToken(SystemAgent),
          useValue: systemAgentsRepo,
        },
        {
          provide: getRepositoryToken(BusinessSystemAgent),
          useValue: businessSystemAgentsRepo,
        },
        { provide: SystemAgentsService, useValue: systemAgentsService },
      ],
    }).compile();

    service = module.get(BusinessSystemAgentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('importAgent', () => {
    it('importa un agente active con éxito', async () => {
      const agent = makeSystemAgent('active');
      systemAgentsRepo.findOne.mockResolvedValue(agent);
      businessSystemAgentsRepo.findOne.mockResolvedValue(null);
      businessSystemAgentsRepo.save.mockResolvedValue({
        id: 'link-uuid',
        businessId: BUSINESS_ID,
        systemAgentId: agent.id,
      });

      const result = await service.importAgent(BUSINESS_ID, agent.id);

      expect(businessSystemAgentsRepo.save).toHaveBeenCalled();
      expect(result.systemAgent).toEqual(agent);
    });

    it('rechaza importar un agente coming_soon', async () => {
      const agent = makeSystemAgent('coming_soon');
      systemAgentsRepo.findOne.mockResolvedValue(agent);

      await expect(
        service.importAgent(BUSINESS_ID, agent.id),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(businessSystemAgentsRepo.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el system agent no existe', async () => {
      systemAgentsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.importAgent(BUSINESS_ID, 'missing-uuid'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('es idempotente: si ya estaba importado no crea una fila duplicada', async () => {
      const agent = makeSystemAgent('active');
      const existing = {
        id: 'link-uuid',
        businessId: BUSINESS_ID,
        systemAgentId: agent.id,
        importedAt: new Date('2026-01-01'),
        systemAgent: agent,
      };
      systemAgentsRepo.findOne.mockResolvedValue(agent);
      businessSystemAgentsRepo.findOne.mockResolvedValue(existing);

      const result = await service.importAgent(BUSINESS_ID, agent.id);

      expect(result).toEqual({
        importedAt: existing.importedAt,
        systemAgent: agent,
      });
      expect(businessSystemAgentsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findImported', () => {
    it('devuelve solo los agentes importados por el businessId pedido', async () => {
      const agent = makeSystemAgent('active');
      const rows = [
        {
          id: 'link-uuid',
          businessId: BUSINESS_ID,
          systemAgentId: agent.id,
          importedAt: new Date('2026-01-01'),
          systemAgent: agent,
        },
      ];
      businessSystemAgentsRepo.find.mockResolvedValue(rows);

      const result = await service.findImported(BUSINESS_ID);

      expect(businessSystemAgentsRepo.find).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID },
        relations: ['systemAgent', 'systemAgent.category'],
        order: { importedAt: 'DESC' },
      });
      expect(result).toEqual([
        { importedAt: rows[0].importedAt, systemAgent: agent },
      ]);
      const findArgs = businessSystemAgentsRepo.find.mock.calls[0][0];
      expect(findArgs.where.businessId).not.toBe(OTHER_BUSINESS_ID);
    });
  });
});
