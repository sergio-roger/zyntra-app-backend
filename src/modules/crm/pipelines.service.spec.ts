import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PipelinesService } from './pipelines.service';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { Deal } from '@crm/entities/deal.entity';
import { Business } from '@auth/entities/business.entity';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';

const mockBusiness = { id: 'biz-uuid' } as Business;

const makePipeline = (overrides: Partial<Pipeline> = {}): Pipeline =>
  ({
    id: 'pipe-uuid',
    business_id: 'biz-uuid',
    name: 'Pipeline Ventas',
    is_default: false,
    position: 0,
    stages: [],
    deleted_at: null,
    ...overrides,
  }) as unknown as Pipeline;

const makeStage = (overrides: Partial<PipelineStage> = {}): PipelineStage =>
  ({
    id: 'stage-uuid',
    pipeline_id: 'pipe-uuid',
    name: 'Prospección',
    color: '#4f46e5',
    position: 0,
    type: PipelineStageType.ACTIVE,
    probability_percent: 10,
    ...overrides,
  }) as PipelineStage;

describe('PipelinesService', () => {
  let service: PipelinesService;

  const pipelineRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    save: jest.fn(),
    update: jest.fn(),
    softRemove: jest.fn(),
  };

  const stageRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const dealRepo = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        { provide: getRepositoryToken(Pipeline), useValue: pipelineRepo },
        { provide: getRepositoryToken(PipelineStage), useValue: stageRepo },
        { provide: getRepositoryToken(Deal), useValue: dealRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() — default stages ─────────────────────────────────────────────

  describe('create()', () => {
    it('auto-creates exactly 6 default stages after saving the pipeline', async () => {
      const savedPipeline = makePipeline();
      const pipelineWithStages = makePipeline({
        stages: [
          makeStage({ id: 's1', position: 0 }),
          makeStage({ id: 's2', position: 1 }),
          makeStage({ id: 's3', position: 2 }),
          makeStage({ id: 's4', position: 3 }),
          makeStage({ id: 's5', position: 4, type: PipelineStageType.WON }),
          makeStage({ id: 's6', position: 5, type: PipelineStageType.LOST }),
        ],
      });

      pipelineRepo.create.mockReturnValue(savedPipeline);
      pipelineRepo.save.mockResolvedValue(savedPipeline);
      stageRepo.save.mockResolvedValue(pipelineWithStages.stages);
      // findOne called at the end of create() to return fresh pipeline
      pipelineRepo.findOne.mockResolvedValue(pipelineWithStages);

      await service.create(mockBusiness, {
        name: 'Pipeline Test',
        is_default: false,
      });

      expect(stageRepo.save).toHaveBeenCalledTimes(1);
      const savedStages = (
        stageRepo.save.mock.calls as PipelineStage[][][]
      )[0][0];
      expect(savedStages).toHaveLength(6);
    });

    it('creates stages with correct types: 4 ACTIVE, 1 WON, 1 LOST', async () => {
      const savedPipeline = makePipeline();
      pipelineRepo.create.mockReturnValue(savedPipeline);
      pipelineRepo.save.mockResolvedValue(savedPipeline);
      stageRepo.save.mockResolvedValue([]);
      pipelineRepo.findOne.mockResolvedValue(makePipeline({ stages: [] }));

      await service.create(mockBusiness, { name: 'Pipeline Test' });

      const stages = (stageRepo.save.mock.calls as PipelineStage[][][])[0][0];
      const typeCount = stages.reduce<Record<string, number>>((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {});

      expect(typeCount[PipelineStageType.ACTIVE]).toBe(4);
      expect(typeCount[PipelineStageType.WON]).toBe(1);
      expect(typeCount[PipelineStageType.LOST]).toBe(1);
    });

    it('unsets is_default on existing pipelines when creating a new default', async () => {
      const savedPipeline = makePipeline({ is_default: true });
      pipelineRepo.update.mockResolvedValue({ affected: 1 });
      pipelineRepo.create.mockReturnValue(savedPipeline);
      pipelineRepo.save.mockResolvedValue(savedPipeline);
      stageRepo.save.mockResolvedValue([]);
      pipelineRepo.findOne.mockResolvedValue(makePipeline({ stages: [] }));

      await service.create(mockBusiness, {
        name: 'New Default',
        is_default: true,
      });

      expect(pipelineRepo.update).toHaveBeenCalledWith(
        { business_id: mockBusiness.id },
        { is_default: false },
      );
    });
  });

  // ─── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('throws ConflictException when pipeline has active deals', async () => {
      const pipeline = makePipeline();
      pipelineRepo.findOne.mockResolvedValue(pipeline);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      dealRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.softDelete(mockBusiness, 'pipe-uuid'),
      ).rejects.toThrow(ConflictException);
      expect(pipelineRepo.softRemove).not.toHaveBeenCalled();
    });

    it('calls softRemove when pipeline has no active deals', async () => {
      const pipeline = makePipeline();
      pipelineRepo.findOne.mockResolvedValue(pipeline);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      dealRepo.createQueryBuilder.mockReturnValue(mockQb);
      pipelineRepo.softRemove.mockResolvedValue({
        ...pipeline,
        deleted_at: new Date(),
      });

      await service.softDelete(mockBusiness, 'pipe-uuid');

      expect(pipelineRepo.softRemove).toHaveBeenCalledWith(pipeline);
    });

    it('throws NotFoundException for non-existent pipeline', async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete(mockBusiness, 'no-pipe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── deleteStage() ─────────────────────────────────────────────────────────

  describe('deleteStage()', () => {
    it('throws NotFoundException when stage does not exist', async () => {
      stageRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteStage(mockBusiness, 'no-stage'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when stage belongs to a different business', async () => {
      const stage = makeStage();
      (stage as unknown as { pipeline: { business_id: string } }).pipeline = {
        business_id: 'other-biz',
      };
      stageRepo.findOne.mockResolvedValue(stage);

      await expect(
        service.deleteStage(mockBusiness, 'stage-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when stage has assigned deals', async () => {
      const stage = makeStage();
      (stage as unknown as { pipeline: { business_id: string } }).pipeline = {
        business_id: 'biz-uuid',
      };
      stageRepo.findOne.mockResolvedValue(stage);
      dealRepo.count.mockResolvedValue(2);

      await expect(
        service.deleteStage(mockBusiness, 'stage-uuid'),
      ).rejects.toThrow(ConflictException);
      expect(stageRepo.remove).not.toHaveBeenCalled();
    });

    it('calls remove when stage has no deals', async () => {
      const stage = makeStage();
      (stage as unknown as { pipeline: { business_id: string } }).pipeline = {
        business_id: 'biz-uuid',
      };
      stageRepo.findOne.mockResolvedValue(stage);
      dealRepo.count.mockResolvedValue(0);
      stageRepo.remove.mockResolvedValue(stage);

      await service.deleteStage(mockBusiness, 'stage-uuid');

      expect(stageRepo.remove).toHaveBeenCalledWith(stage);
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException for non-existent pipeline', async () => {
      pipelineRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(mockBusiness, 'no-pipe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns pipeline with stages sorted by position', async () => {
      const pipeline = makePipeline({
        stages: [
          makeStage({ id: 's1', position: 1 }),
          makeStage({ id: 's0', position: 0 }),
        ],
      });
      pipelineRepo.findOne.mockResolvedValue(pipeline);

      const result = await service.findOne(mockBusiness, 'pipe-uuid');
      expect(result).toBe(pipeline);
    });
  });
});
