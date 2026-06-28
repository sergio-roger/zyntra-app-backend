import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmUsersService } from './crm-users.service';
import { CrmUser } from './entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole } from '@crm/enums/user-role.enum';
import { UserStatus } from '@crm/enums/user-status.enum';

const mockBusiness = {
  id: 'business-uuid-1234',
  name: 'Test Business',
} as Business;

const mockCrmUser = {
  id: 'user-uuid-1',
  businessId: 'business-uuid-1234',
  name: 'John Doe',
  email: 'john@example.com',
  teams: [],
} as unknown as CrmUser;

describe('CrmUsersService', () => {
  let service: CrmUsersService;
  let repo: Repository<CrmUser>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmUsersService,
        {
          provide: getRepositoryToken(CrmUser),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CrmUsersService>(CrmUsersService);
    repo = module.get<Repository<CrmUser>>(getRepositoryToken(CrmUser));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return all users for a business ordered by createdAt', async () => {
      const usersList = [mockCrmUser];
      mockRepository.find.mockResolvedValue(usersList);

      const result = await service.list(mockBusiness);

      expect(repo.find).toHaveBeenCalledWith({
        where: { businessId: mockBusiness.id },
        relations: ['teams'],
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(usersList);
    });
  });

  describe('findOne', () => {
    it('should return a user if they exist and belong to the business', async () => {
      mockRepository.findOne.mockResolvedValue(mockCrmUser);

      const result = await service.findOne(mockBusiness, 'user-uuid-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', businessId: mockBusiness.id },
        relations: ['teams'],
      });
      expect(result).toEqual(mockCrmUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockBusiness, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Alice Smith',
      email: 'alice@example.com',
      role: UserRole.AGENT,
    };

    it('should create and save a new user if email is unique for the business', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...createDto,
        firstName: 'Alice',
        lastName: 'Smith',
        status: UserStatus.ACTIVE,
        isActive: true,
        isAccountActivated: false,
        businessId: mockBusiness.id,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-user-uuid',
        ...createDto,
        businessId: mockBusiness.id,
      });

      const result = await service.create(mockBusiness, createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: createDto.email, businessId: mockBusiness.id },
      });
      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        firstName: 'Alice',
        lastName: 'Smith',
        status: UserStatus.ACTIVE,
        isActive: true,
        isAccountActivated: false,
        businessId: mockBusiness.id,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should throw ConflictException if email already registered for this business', async () => {
      mockRepository.findOne.mockResolvedValue(mockCrmUser);

      await expect(
        service.create(mockBusiness, {
          name: 'John Dup',
          email: mockCrmUser.email,
          role: UserRole.AGENT,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'John Doe Updated' };

    it('should update and save the user info', async () => {
      const existingUser = { ...mockCrmUser };
      mockRepository.findOne.mockResolvedValue(existingUser);
      mockRepository.save.mockResolvedValue({
        ...existingUser,
        name: updateDto.name,
      });

      const result = await service.update(
        mockBusiness,
        mockCrmUser.id,
        updateDto,
      );

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('calls softRemove — not hard remove — ensuring soft-delete rule', async () => {
      mockRepository.findOne.mockResolvedValue(mockCrmUser);
      mockRepository.softRemove.mockResolvedValue({
        ...mockCrmUser,
        deletedAt: new Date(),
      });

      await service.remove(mockBusiness, mockCrmUser.id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockCrmUser.id, businessId: mockBusiness.id },
        relations: ['teams'],
      });
      expect(repo.softRemove).toHaveBeenCalledWith(mockCrmUser);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockBusiness, 'no-such-uuid'),
      ).rejects.toThrow(NotFoundException);

      expect(repo.softRemove).not.toHaveBeenCalled();
    });
  });
});
