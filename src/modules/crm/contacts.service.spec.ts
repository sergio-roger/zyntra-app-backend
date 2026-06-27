/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from '@crm/entities/contact.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { Deal } from '@crm/entities/deal.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { ListContactsDto } from '@crm/dto/list-contacts.dto';

const mockBusiness = {
  id: 'biz-uuid',
  plan_object: { contact_limit: 999999 },
} as Business;

const makeContact = (overrides: Partial<Contact> = {}): Contact =>
  ({
    id: 'contact-uuid',
    businessId: 'biz-uuid',
    name: 'Test Contact',
    email: 'test@example.com',
    phone: null,
    source: 'manual',
    ownerId: null,
    isArchived: false,
    tags: [],
    ...overrides,
  }) as unknown as Contact;

describe('ContactsService', () => {
  let service: ContactsService;

  // ── QueryBuilder stub ────────────────────────────────────────────────────────
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const contactsRepo = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    save: jest.fn(),
    softRemove: jest.fn(),
    count: jest.fn(),
  };
  const activitiesRepo = {
    createQueryBuilder: jest.fn(() => qb),
    save: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
  };
  const dealsRepo = { create: jest.fn(<T>(x: T): T => x), save: jest.fn() };
  const crmUsersRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getRepositoryToken(Contact), useValue: contactsRepo },
        {
          provide: getRepositoryToken(ContactActivity),
          useValue: activitiesRepo,
        },
        { provide: getRepositoryToken(Deal), useValue: dealsRepo },
        { provide: getRepositoryToken(CrmUser), useValue: crmUsersRepo },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    jest.clearAllMocks();
    contactsRepo.createQueryBuilder.mockReturnValue(qb);
    qb.leftJoinAndSelect.mockReturnThis();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
    qb.orderBy.mockReturnThis();
    qb.skip.mockReturnThis();
    qb.take.mockReturnThis();
  });

  // ── list() ───────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns paginated contacts with default pagination', async () => {
      const contacts = [makeContact()];
      qb.getManyAndCount.mockResolvedValue([contacts, 1]);

      const result = await service.list(mockBusiness, {} as ListContactsDto);

      expect(result).toEqual({
        items: contacts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(qb.where).toHaveBeenCalledWith('c.businessId = :bid', {
        bid: 'biz-uuid',
      });
    });

    it('filters by lifecycleStageId', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, {
        lifecycleStageId: 'stage-uuid',
      } as ListContactsDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'c.lifecycleStageId = :lifecycleStageId',
        { lifecycleStageId: 'stage-uuid' },
      );
    });

    it('filters by source', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, {
        source: 'chatbot',
      } as ListContactsDto);

      expect(qb.andWhere).toHaveBeenCalledWith('c.source = :source', {
        source: 'chatbot',
      });
    });

    it('filters by ownerId (specific user)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, {
        ownerId: 'user-uuid',
      } as ListContactsDto);

      expect(qb.andWhere).toHaveBeenCalledWith('c.ownerId = :ownerId', {
        ownerId: 'user-uuid',
      });
    });

    it('filters unassigned contacts when ownerId is "unassigned"', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, {
        ownerId: 'unassigned',
      } as ListContactsDto);

      expect(qb.andWhere).toHaveBeenCalledWith('c.ownerId IS NULL');
    });

    it('filters by search term across name, email and phone', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, { search: 'john' } as ListContactsDto);

      const andWhereCalls: string[] = qb.andWhere.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(andWhereCalls.some((c) => typeof c === 'object')).toBe(true);
    });

    it('filters archived contacts when isArchived is true', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, { isArchived: true } as ListContactsDto);

      expect(qb.andWhere).toHaveBeenCalledWith('c.isArchived = :isArchived', {
        isArchived: true,
      });
    });

    it('respects custom page and limit', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.list(mockBusiness, {
        page: 3,
        limit: 10,
      } as ListContactsDto);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('calculates totalPages as 1 when total is 0', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.list(mockBusiness, {});

      expect(result.totalPages).toBe(1);
    });
  });

  // ── findOne() ────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a contact that belongs to the business', async () => {
      const contact = makeContact();
      contactsRepo.findOne.mockResolvedValue(contact);

      const result = await service.findOne(mockBusiness, 'contact-uuid');

      expect(result).toBe(contact);
      expect(contactsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'contact-uuid', businessId: 'biz-uuid' },
        relations: ['tags', 'lifecycleStage', 'owner'],
      });
    });

    it('throws NotFoundException when contact does not exist', async () => {
      contactsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockBusiness, 'missing-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── listMembers() ─────────────────────────────────────────────────────────────

  describe('listMembers()', () => {
    it('returns active members for the business ordered by name', async () => {
      const members = [
        { id: 'u1', name: 'Ana' },
        { id: 'u2', name: 'Beto' },
      ];
      crmUsersRepo.find.mockResolvedValue(members);

      const result = await service.listMembers(mockBusiness);

      expect(result).toEqual(members);
      expect(crmUsersRepo.find).toHaveBeenCalledWith({
        where: { business_id: 'biz-uuid', is_active: true },
        select: ['id', 'name'],
        order: { name: 'ASC' },
      });
    });
  });
});
