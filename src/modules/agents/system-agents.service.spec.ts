import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemAgentsService } from './system-agents.service';
import { SystemAgent } from './entities/system-agent.entity';

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

  const repo = { find: jest.fn() };

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

  it('devuelve el catálogo completo ordenado por createdAt, sin filtrar por status', async () => {
    const agents = [
      makeAgent('marketing-strategist', 'active'),
      makeAgent('seo-specialist', 'coming_soon'),
    ];
    repo.find.mockResolvedValue(agents);

    const result = await service.findAll();

    expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
    expect(result).toEqual(agents);
    expect(result.some((a) => a.status === 'coming_soon')).toBe(true);
  });
});
