import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { Deal } from '@crm/entities/deal.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Pipeline } from '@crm/entities/pipeline.entity';
import { PipelineStage } from '@crm/entities/pipeline-stage.entity';
import { DealStageHistory } from '@crm/entities/deal-stage-history.entity';
import { Business } from '@auth/entities/business.entity';
import { DealStatus } from '@crm/enums/deal-status.enum';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';
import { ActivityType } from '@crm/enums/activity-type.enum';

const mockBusiness = { id: 'biz-uuid' } as Business;

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

const makeDeal = (overrides: Partial<Deal> = {}): Deal =>
  ({
    id: 'deal-uuid',
    business_id: 'biz-uuid',
    title: 'Test Deal',
    value: 5000,
    pipeline_id: 'pipe-uuid',
    stage_id: 'stage-uuid',
    status: DealStatus.OPEN,
    contact_id: 'contact-uuid',
    closed_at: null,
    deleted_at: null,
    ...overrides,
  }) as unknown as Deal;

describe('DealsService', () => {
  let service: DealsService;

  const dealsRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softRemove: jest.fn(),
    find: jest.fn(),
  };
  const contactsRepo = { findOne: jest.fn() };
  const activitiesRepo = {
    save: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
  };
  const pipelineRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const stageRepo = {
    findOne: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    save: jest.fn(),
  };
  const historyRepo = {
    save: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    update: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: getRepositoryToken(Deal), useValue: dealsRepo },
        { provide: getRepositoryToken(Contact), useValue: contactsRepo },
        {
          provide: getRepositoryToken(ContactActivity),
          useValue: activitiesRepo,
        },
        { provide: getRepositoryToken(Pipeline), useValue: pipelineRepo },
        { provide: getRepositoryToken(PipelineStage), useValue: stageRepo },
        {
          provide: getRepositoryToken(DealStageHistory),
          useValue: historyRepo,
        },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('calls softRemove on the repo', async () => {
      const deal = makeDeal();
      dealsRepo.findOne.mockResolvedValue(deal);
      dealsRepo.softRemove.mockResolvedValue({
        ...deal,
        deleted_at: new Date(),
      });

      await service.remove(mockBusiness, 'deal-uuid');

      expect(dealsRepo.softRemove).toHaveBeenCalledWith(deal);
      expect(dealsRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when deal does not exist', async () => {
      dealsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockBusiness, 'no-such-uuid'),
      ).rejects.toThrow(NotFoundException);
      expect(dealsRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException for non-existent deal', async () => {
      dealsRepo.findOne.mockResolvedValue(null);
      await expect(service['findOne'](mockBusiness, 'no-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the deal when found', async () => {
      const deal = makeDeal();
      dealsRepo.findOne.mockResolvedValue(deal);
      const result = await service['findOne'](mockBusiness, 'deal-uuid');
      expect(result).toBe(deal);
    });
  });

  // ─── update() — stage transitions ──────────────────────────────────────────

  describe('update() — stage transitions', () => {
    it('keeps status OPEN and clears closed_at when moving to an ACTIVE stage', async () => {
      const deal = makeDeal({ stage_id: 'stage-old', status: DealStatus.OPEN });
      const newStage = makeStage({
        id: 'stage-new',
        type: PipelineStageType.ACTIVE,
      });

      dealsRepo.findOne.mockResolvedValue(deal);
      stageRepo.findOne.mockResolvedValue(newStage);
      historyRepo.update.mockResolvedValue({ affected: 1 });
      historyRepo.save.mockResolvedValue({});
      activitiesRepo.save.mockResolvedValue({});
      dealsRepo.save.mockImplementation((d: Deal) => Promise.resolve(d));

      const result = await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'stage-new',
      });

      expect(result.status).toBe(DealStatus.OPEN);
      expect(result.closed_at).toBeNull();
    });

    it('sets status WON and closed_at when moving to a WON stage', async () => {
      const deal = makeDeal({ stage_id: 'stage-old', status: DealStatus.OPEN });
      const wonStage = makeStage({
        id: 'stage-won',
        type: PipelineStageType.WON,
        name: 'Ganado',
      });
      const updatedDeal = makeDeal({
        stage_id: 'stage-won',
        status: DealStatus.WON,
        closed_at: new Date(),
      });

      // update() calls findOne twice: once to load the current deal, once to
      // return the result after dealsRepo.update(). The second call must return
      // the already-persisted state (status WON) so the assertion holds.
      dealsRepo.findOne.mockResolvedValueOnce(deal).mockResolvedValueOnce(updatedDeal);
      stageRepo.findOne.mockResolvedValue(wonStage);
      historyRepo.update.mockResolvedValue({ affected: 1 });
      historyRepo.save.mockResolvedValue({});
      activitiesRepo.save.mockResolvedValue({});
      dealsRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'stage-won',
      });

      expect(result.status).toBe(DealStatus.WON);
      expect(result.closed_at).toBeInstanceOf(Date);
    });

    it('sets status LOST and closed_at when moving to a LOST stage', async () => {
      const deal = makeDeal({ stage_id: 'stage-old', status: DealStatus.OPEN });
      const lostStage = makeStage({
        id: 'stage-lost',
        type: PipelineStageType.LOST,
        name: 'Perdido',
      });
      const updatedDeal = makeDeal({
        stage_id: 'stage-lost',
        status: DealStatus.LOST,
        closed_at: new Date(),
      });

      dealsRepo.findOne.mockResolvedValueOnce(deal).mockResolvedValueOnce(updatedDeal);
      stageRepo.findOne.mockResolvedValue(lostStage);
      historyRepo.update.mockResolvedValue({ affected: 1 });
      historyRepo.save.mockResolvedValue({});
      activitiesRepo.save.mockResolvedValue({});
      dealsRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'stage-lost',
      });

      expect(result.status).toBe(DealStatus.LOST);
      expect(result.closed_at).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when target stage does not belong to the pipeline', async () => {
      const deal = makeDeal({ stage_id: 'stage-old' });

      dealsRepo.findOne.mockResolvedValue(deal);
      stageRepo.findOne.mockResolvedValue(null); // stage not found in this pipeline

      await expect(
        service.update(mockBusiness, 'deal-uuid', {
          stage_id: 'stage-other-pipeline',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(dealsRepo.save).not.toHaveBeenCalled();
    });

    it('does NOT create history or update status when stage_id is unchanged', async () => {
      const deal = makeDeal({ stage_id: 'same-stage' });

      dealsRepo.findOne.mockResolvedValue(deal);
      dealsRepo.save.mockImplementation((d: Deal) => Promise.resolve(d));

      await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'same-stage',
      });

      expect(stageRepo.findOne).not.toHaveBeenCalled();
      expect(historyRepo.update).not.toHaveBeenCalled();
      expect(historyRepo.save).not.toHaveBeenCalled();
    });

    it('creates a history record when moving stages', async () => {
      const deal = makeDeal({ stage_id: 'stage-old' });
      const newStage = makeStage({
        id: 'stage-new',
        type: PipelineStageType.ACTIVE,
      });

      dealsRepo.findOne.mockResolvedValue(deal);
      stageRepo.findOne.mockResolvedValue(newStage);
      historyRepo.update.mockResolvedValue({ affected: 1 });
      historyRepo.save.mockResolvedValue({});
      activitiesRepo.save.mockResolvedValue({});
      dealsRepo.save.mockImplementation((d: Deal) => Promise.resolve(d));

      await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'stage-new',
      });

      // closes open history entry
      expect(historyRepo.update).toHaveBeenCalledWith(
        { deal_id: deal.id, left_at: expect.anything() as unknown },
        { left_at: expect.any(Date) as Date },
      );
      // opens new history entry
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deal_id: deal.id, stage_id: 'stage-new' }),
      );
    });

    it('creates a STAGE_CHANGE activity when moving stages', async () => {
      const deal = makeDeal({ stage_id: 'stage-old' });
      const newStage = makeStage({
        id: 'stage-new',
        name: 'Propuesta',
        type: PipelineStageType.ACTIVE,
      });

      dealsRepo.findOne.mockResolvedValue(deal);
      stageRepo.findOne.mockResolvedValue(newStage);
      historyRepo.update.mockResolvedValue({ affected: 1 });
      historyRepo.save.mockResolvedValue({});
      activitiesRepo.save.mockResolvedValue({});
      dealsRepo.save.mockImplementation((d: Deal) => Promise.resolve(d));

      await service.update(mockBusiness, 'deal-uuid', {
        stage_id: 'stage-new',
      });

      expect(activitiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: ActivityType.STAGE_CHANGE }),
      );
    });
  });

  // ─── list() ────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('uses createQueryBuilder and returns paginated results', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeDeal()], 1]),
      };
      dealsRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.list(mockBusiness, {});

      expect(dealsRepo.createQueryBuilder).toHaveBeenCalledWith('d');
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
    });
  });

  // ─── kanban() ──────────────────────────────────────────────────────────────

  describe('kanban()', () => {
    it('includes all deals in the kanban columns regardless of status', async () => {
      const stage = makeStage({ id: 'stage-uuid' });
      const pipeline = {
        id: 'pipe-uuid',
        business_id: 'biz-uuid',
        stages: [stage],
      };
      const openDeal = makeDeal({
        id: 'open-deal',
        stage_id: 'stage-uuid',
        status: DealStatus.OPEN,
      });
      const wonDeal = makeDeal({
        id: 'won-deal',
        stage_id: 'stage-uuid',
        status: DealStatus.WON,
      });

      pipelineRepo.findOne.mockResolvedValue(pipeline);
      dealsRepo.find.mockResolvedValue([openDeal, wonDeal]);

      const result = await service.kanban(mockBusiness, 'pipe-uuid');

      expect(result.columns[0].deals).toHaveLength(2);
      // The query must NOT filter by status
      expect(dealsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            status: expect.anything() as unknown,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('throws NotFoundException for non-existent pipeline', async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(service.kanban(mockBusiness, 'no-pipe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
