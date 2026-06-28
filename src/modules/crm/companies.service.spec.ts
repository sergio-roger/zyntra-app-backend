import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Company } from '@crm/entities/company.entity';
import { Tag } from '@crm/entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CrmUser } from '@crm/entities/user.entity';

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
    create: jest.fn().mockImplementation((x: any) => x),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const tagsRepo = {
    find: jest.fn(),
  };

  const crmUsersRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useValue: companiesRepo },
        { provide: getRepositoryToken(Tag), useValue: tagsRepo },
        { provide: getRepositoryToken(CrmUser), useValue: crmUsersRepo },
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
        tax_type: 'NIF',
      });
      expect(companiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name', tax_type: 'NIF' }),
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
