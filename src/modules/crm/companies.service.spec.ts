/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Company } from '@crm/entities/company.entity';
import { Tag } from '@crm/entities/tag.entity';
import { Business } from '@auth/entities/business.entity';

const mockBusiness = {
  id: 'biz-uuid',
} as Business;

const makeCompany = (overrides: Partial<Company> = {}): Company =>
  ({
    id: 'company-uuid',
    business_id: 'biz-uuid',
    name: 'Test Company',
    tax_type: 'RUC',
    identification: '1234567890001',
    website: 'https://test.com',
    employee_range: '11-50',
    owner_id: 'user-uuid',
    industry_id: 'industry-uuid',
    lifecycle_stage_id: 'stage-uuid',
    tags: [],
    ...overrides,
  }) as unknown as Company;

describe('CompaniesService', () => {
  let service: CompaniesService;

  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const companiesRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((x: unknown) => x),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const tagsRepo = {
    find: jest.fn(),
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useValue: companiesRepo },
        { provide: getRepositoryToken(Tag), useValue: tagsRepo },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a company with new fields', async () => {
      const dto = {
        name: 'New Company',
        tax_type: 'RUC',
        identification: '0987654321001',
        employee_range: '1-10',
        industry_id: 'industry-uuid',
        owner_id: 'user-uuid',
      };

      companiesRepo.findOne.mockResolvedValueOnce(null);
      companiesRepo.save.mockResolvedValueOnce({ id: 'new-uuid', ...dto });

      const result = await service.create(mockBusiness, dto);
      expect(result).toBeDefined();
      expect(companiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Company',
          tax_type: 'RUC',
          employee_range: '1-10',
        }),
      );
    });

    it('should throw conflict if name already exists in same business', async () => {
      companiesRepo.findOne.mockResolvedValueOnce(
        makeCompany({ name: 'Existing' }),
      );
      await expect(
        service.create(mockBusiness, { name: 'Existing' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── list() ───────────────────────────────────────────────────────────────────

  describe('list()', () => {
    beforeEach(() => {
      companiesRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);
    });

    it('returns paginated result with default pagination', async () => {
      const companies = [makeCompany()];
      qb.getManyAndCount.mockResolvedValue([companies, 1]);

      const result = await service.list(mockBusiness, {} as any);

      expect(result).toEqual({
        items: companies,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('calculates totalPages as 1 when total is 0', async () => {
      const result = await service.list(mockBusiness, {} as any);
      expect(result.totalPages).toBe(1);
    });
  });

  // ── applyCustomFieldFilters() via list() ─────────────────────────────────────

  describe('applyCustomFieldFilters() via list()', () => {
    beforeEach(() => {
      companiesRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);
    });

    it('equals operator — strips customFields. camelCase prefix', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.industry', operator: 'equals', value: 'SaaS' },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "e.custom_fields->>'industry' = :cf_0",
        { cf_0: 'SaaS' },
      );
    });

    it('equals operator — strips custom_fields. snake_case prefix', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          {
            field: 'custom_fields.industry',
            operator: 'equals',
            value: 'SaaS',
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "e.custom_fields->>'industry' = :cf_0",
        { cf_0: 'SaaS' },
      );
    });

    it('not_equals operator', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.tier', operator: 'not_equals', value: 'free' },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "e.custom_fields->>'tier' != :cf_0",
        { cf_0: 'free' },
      );
    });

    it('contains operator — wraps value with ILIKE wildcards', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          {
            field: 'customFields.notes',
            operator: 'contains',
            value: 'enterprise',
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "e.custom_fields->>'notes' ILIKE :cf_0",
        { cf_0: '%enterprise%' },
      );
    });

    it('greater_than operator — casts to numeric', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          {
            field: 'customFields.employees',
            operator: 'greater_than',
            value: 100,
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(e.custom_fields->>'employees')::numeric > :cf_0",
        { cf_0: 100 },
      );
    });

    it('less_than operator — casts to numeric', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          {
            field: 'customFields.revenue',
            operator: 'less_than',
            value: 1000000,
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(e.custom_fields->>'revenue')::numeric < :cf_0",
        { cf_0: 1000000 },
      );
    });

    it('is_empty operator', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.website', operator: 'is_empty', value: '' },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(e.custom_fields->>'website' IS NULL OR e.custom_fields->>'website' = '')",
      );
    });

    it('is_not_empty operator', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          {
            field: 'customFields.website',
            operator: 'is_not_empty',
            value: '',
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(e.custom_fields->>'website' IS NOT NULL AND e.custom_fields->>'website' != '')",
      );
    });

    it('applies multiple conditions with indexed param keys', async () => {
      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.tier', operator: 'equals', value: 'gold' },
          {
            field: 'customFields.employees',
            operator: 'greater_than',
            value: 50,
          },
        ]),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "e.custom_fields->>'tier' = :cf_0",
        { cf_0: 'gold' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "(e.custom_fields->>'employees')::numeric > :cf_1",
        { cf_1: 50 },
      );
    });

    it('silently ignores malformed JSON', async () => {
      const callsBefore = qb.andWhere.mock.calls.length;

      await service.list(mockBusiness, {
        customFieldFilters: '{bad json}',
      } as any);

      expect(qb.andWhere.mock.calls.length).toBe(callsBefore);
    });

    it('skips condition when field name is empty after sanitization', async () => {
      const callsBefore = qb.andWhere.mock.calls.length;

      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.', operator: 'equals', value: 'x' },
        ]),
      } as any);

      expect(qb.andWhere.mock.calls.length).toBe(callsBefore);
    });

    it('ignores unknown operators', async () => {
      const callsBefore = qb.andWhere.mock.calls.length;

      await service.list(mockBusiness, {
        customFieldFilters: JSON.stringify([
          { field: 'customFields.tier', operator: 'regex', value: '.*' },
        ]),
      } as any);

      expect(qb.andWhere.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('update', () => {
    it('should update a company successfully', async () => {
      const existing = makeCompany();
      companiesRepo.findOne.mockResolvedValueOnce(existing);
      companiesRepo.save.mockResolvedValueOnce({
        ...existing,
        name: 'Updated Name',
        tax_type: 'NIF',
      });

      const res = await service.update(mockBusiness, 'company-uuid', {
        name: 'Updated Name',
        taxType: 'NIF',
      });
      expect(companiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name', taxType: 'NIF' }),
      );
      expect(res.name).toBe('Updated Name');
    });

    it('should throw if company not found', async () => {
      companiesRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.update(mockBusiness, 'not-found', { name: 'hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
