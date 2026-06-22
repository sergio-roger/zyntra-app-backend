import { Business } from '@auth/entities/business.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifecycleHistory } from '@/modules/lifecycle/entities/lifecycle-history.entity';
import {
  LifecycleStage,
  LifecycleStageType,
} from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { LifecycleService } from '@/modules/lifecycle/lifecycle.service';

const mockBusiness = {
  id: 'business-uuid-1234',
  name: 'Test Business',
} as Business;

const mockStage = {
  id: 'stage-uuid-1',
  business_id: 'business-uuid-1234',
  name: 'New Lead',
  description: 'Newly entered contact',
  icon: '🆕',
  position: 0,
  type: LifecycleStageType.ACTIVE,
  is_default: true,
  is_won: false,
  is_system: true,
} as LifecycleStage;

describe('LifecycleService', () => {
  let service: LifecycleService;
  let stageRepo: Repository<LifecycleStage>;
  let historyRepo: Repository<LifecycleHistory>;

  const mockStageRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        {
          provide: getRepositoryToken(LifecycleStage),
          useValue: mockStageRepository,
        },
        {
          provide: getRepositoryToken(LifecycleHistory),
          useValue: mockHistoryRepository,
        },
      ],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
    stageRepo = module.get<Repository<LifecycleStage>>(
      getRepositoryToken(LifecycleStage),
    );
    historyRepo = module.get<Repository<LifecycleHistory>>(
      getRepositoryToken(LifecycleHistory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logStageChange', () => {
    it('should create and save a new lifecycle history entry', async () => {
      const mockHistory = {
        id: 'history-uuid-1',
        contact_id: 'contact-uuid-1',
        new_stage_id: 'stage-uuid-2',
        old_stage_id: 'stage-uuid-1',
        changed_by_id: 'user-uuid-1',
        change_reason: 'Deal progression',
      } as LifecycleHistory;

      mockHistoryRepository.create.mockReturnValue(mockHistory);
      mockHistoryRepository.save.mockResolvedValue(mockHistory);

      const result = await service.logStageChange(
        'contact-uuid-1',
        'stage-uuid-2',
        'stage-uuid-1',
        'user-uuid-1',
        'Deal progression',
      );

      expect(historyRepo.create).toHaveBeenCalledWith({
        contact_id: 'contact-uuid-1',
        new_stage_id: 'stage-uuid-2',
        old_stage_id: 'stage-uuid-1',
        changed_by_id: 'user-uuid-1',
        change_reason: 'Deal progression',
      });
      expect(historyRepo.save).toHaveBeenCalledWith(mockHistory);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('findAll', () => {
    it('should return existing stages for a business ordered by position', async () => {
      const stagesList = [mockStage];
      mockStageRepository.find.mockResolvedValue(stagesList);

      const result = await service.findAll(mockBusiness.id);

      expect(stageRepo.find).toHaveBeenCalledWith({
        where: { business_id: mockBusiness.id },
        order: { position: 'ASC' },
      });
      expect(result).toEqual(stagesList);
    });

    it('should seed and return default stages if none exist in the database', async () => {
      mockStageRepository.find.mockResolvedValue([]);

      const seedSpy = jest
        .spyOn(service, 'seedDefaultStages')
        .mockResolvedValue([mockStage]);

      const result = await service.findAll(mockBusiness.id);

      expect(seedSpy).toHaveBeenCalledWith(mockBusiness.id);
      expect(result).toEqual([mockStage]);
    });
  });

  describe('seedDefaultStages', () => {
    it('should create and save default stages', async () => {
      mockStageRepository.create.mockImplementation(
        (dto: unknown) => dto as LifecycleStage,
      );
      mockStageRepository.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities as LifecycleStage[]),
      );

      const result = await service.seedDefaultStages(mockBusiness.id);

      expect(stageRepo.create).toHaveBeenCalledTimes(5);
      expect(stageRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(5);
      expect(result[0].business_id).toBe(mockBusiness.id);
    });
  });

  describe('updateStages', () => {
    it('should update stages and remove any that are not system-managed and not kept', async () => {
      const existingStage = {
        id: 'stage-uuid-1',
        is_system: false,
        business_id: mockBusiness.id,
      } as LifecycleStage;
      const stageToKeep = {
        id: 'stage-uuid-2',
        is_system: true,
        business_id: mockBusiness.id,
      } as LifecycleStage;

      mockStageRepository.find.mockResolvedValue([existingStage, stageToKeep]);
      mockStageRepository.remove.mockResolvedValue(undefined);
      mockStageRepository.create.mockImplementation(
        (dto: unknown) => dto as LifecycleStage,
      );
      mockStageRepository.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities as LifecycleStage[]),
      );

      const inputStages = [
        { id: 'stage-uuid-2', name: 'Hot Lead' },
        { name: 'New Custom Stage' },
      ];

      const result = await service.updateStages(mockBusiness.id, inputStages);

      expect(stageRepo.find).toHaveBeenCalledWith({
        where: { business_id: mockBusiness.id },
      });
      expect(stageRepo.remove).toHaveBeenCalledWith([existingStage]);
      expect(stageRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
    });
  });
});
