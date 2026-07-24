import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemAgentsService } from './system-agents.service';
import { SystemAgent } from './entities/system-agent.entity';
import { AgentTool } from './enums/agent-tool.enum';

const makeAgent = (
  slug: string,
  status: 'active' | 'coming_soon',
): SystemAgent =>
  ({
    id: `${slug}-uuid`,
    slug,
    name: slug,
    role: slug,
    description: '',
    status,
    model: 'x',
  }) as SystemAgent;

describe('SystemAgentsService', () => {
  let service: SystemAgentsService;

  const repo = { find: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAgentsService,
        { provide: getRepositoryToken(SystemAgent), useValue: repo },
      ],
    }).compile();

    service = module.get<SystemAgentsService>(SystemAgentsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('devuelve el catálogo completo ordenado por categoría y createdAt, sin filtrar por status', async () => {
    const agents = [
      makeAgent('marketing-strategist', 'active'),
      makeAgent('seo-specialist', 'coming_soon'),
    ];
    repo.find.mockResolvedValue(agents);

    const result = await service.findAll();

    expect(repo.find).toHaveBeenCalledWith({
      relations: ['category'],
      order: { category: { sortOrder: 'ASC' }, createdAt: 'ASC' },
    });
    expect(result).toEqual(agents);
    expect(result.some((a) => a.status === 'coming_soon')).toBe(true);
  });

  describe('getRuntimeConfig', () => {
    it('devuelve solo las tools del System Agent (instructions/model quedan fijos en Mastra)', async () => {
      const agent = makeAgent('marketing-strategist', 'active');
      agent.tools = [AgentTool.WEB_SEARCH];
      repo.findOne.mockResolvedValue(agent);

      const result = await service.getRuntimeConfig(agent.id);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: agent.id } });
      expect(result).toEqual({ tools: [AgentTool.WEB_SEARCH] });
    });

    it('tira NotFoundException si el id no corresponde a ningún System Agent', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getRuntimeConfig('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
