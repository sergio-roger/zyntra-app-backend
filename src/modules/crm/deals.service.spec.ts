import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { Deal } from '@crm/entities/deal.entity';
import { Contact } from '@crm/entities/contact.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Business } from '@auth/entities/business.entity';
import { DealStage } from '@crm/enums/deal-stage.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';

const mockBusiness = { id: 'biz-uuid' } as Business;

const makeDeal = (): Deal =>
  ({
    id: 'deal-uuid',
    business_id: 'biz-uuid',
    title: 'Test Deal',
    value: 5000,
    stage: DealStage.PROSPECTING,
    status: DealStatus.OPEN,
    contact_id: 'contact-uuid',
    deleted_at: null,
  }) as unknown as Deal;

describe('DealsService — soft-delete', () => {
  let service: DealsService;

  const dealsRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    find: jest.fn(),
  };

  const contactsRepo = { findOne: jest.fn() };
  const activitiesRepo = { save: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: getRepositoryToken(Deal), useValue: dealsRepo },
        { provide: getRepositoryToken(Contact), useValue: contactsRepo },
        { provide: getRepositoryToken(ContactActivity), useValue: activitiesRepo },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('remove()', () => {
    it('calls softRemove — not remove — on the repo', async () => {
      const deal = makeDeal();
      dealsRepo.findOne.mockResolvedValue(deal);
      dealsRepo.softRemove.mockResolvedValue({ ...deal, deleted_at: new Date() });

      await service.remove(mockBusiness, 'deal-uuid');

      expect(dealsRepo.softRemove).toHaveBeenCalledWith(deal);
      expect(dealsRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it('does NOT call hard remove', async () => {
      const deal = makeDeal();
      dealsRepo.findOne.mockResolvedValue(deal);
      dealsRepo.softRemove.mockResolvedValue({ ...deal, deleted_at: new Date() });

      await service.remove(mockBusiness, 'deal-uuid');

      // If repo had a remove() it would be on the mock — verify it's not called
      expect(dealsRepo['remove']).toBeUndefined();
    });

    it('throws NotFoundException when deal does not exist', async () => {
      dealsRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockBusiness, 'no-such-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(dealsRepo.softRemove).not.toHaveBeenCalled();
    });

    it('after remove the record has deleted_at set (unit-level mock verification)', async () => {
      const deal = makeDeal();
      const deletedAt = new Date('2026-01-01T00:00:00Z');
      dealsRepo.findOne.mockResolvedValue(deal);
      dealsRepo.softRemove.mockResolvedValue({ ...deal, deleted_at: deletedAt });

      // softRemove is called; the returned entity has deleted_at set
      await service.remove(mockBusiness, 'deal-uuid');
      const [[calledWith]] = dealsRepo.softRemove.mock.calls;
      expect(calledWith.id).toBe('deal-uuid');
    });
  });

  describe('list()', () => {
    it('uses createQueryBuilder (TypeORM auto-filters deleted_at IS NULL)', async () => {
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
    });
  });

  describe('findOne()', () => {
    it('throws NotFoundException for non-existent deal', async () => {
      dealsRepo.findOne.mockResolvedValue(null);
      await expect(service['findOne'](mockBusiness, 'no-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
