import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockBusiness = {
  id: 'business-uuid-1234',
  name: 'Test Business',
} as Business;

const mockTag = {
  id: 'tag-uuid-1',
  business_id: 'business-uuid-1234',
  name: 'Sales',
  color: '#6366f1',
  description: 'Sales team tag',
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
} as Tag;

describe('TagsService', () => {
  let service: TagsService;
  let repo: Repository<Tag>;

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
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    repo = module.get<Repository<Tag>>(getRepositoryToken(Tag));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all tags for a business ordered by name', async () => {
      const tagsList = [mockTag];
      mockRepository.find.mockResolvedValue(tagsList);

      const result = await service.findAll(mockBusiness);

      expect(repo.find).toHaveBeenCalledWith({
        where: { business_id: mockBusiness.id },
        order: { name: 'ASC' },
      });
      expect(result).toEqual(tagsList);
    });
  });

  describe('findOne', () => {
    it('should return a tag if it exists and belongs to the business', async () => {
      mockRepository.findOne.mockResolvedValue(mockTag);

      const result = await service.findOne(mockBusiness, 'tag-uuid-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'tag-uuid-1', business_id: mockBusiness.id },
      });
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockBusiness, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Marketing',
      color: '#10b981',
      description: 'Marketing tag',
    };

    it('should create and save a new tag if name is unique for the business', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...createDto,
        business_id: mockBusiness.id,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-tag-uuid',
        ...createDto,
        business_id: mockBusiness.id,
      });

      const result = await service.create(mockBusiness, createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { business_id: mockBusiness.id, name: createDto.name },
      });
      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        business_id: mockBusiness.id,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should throw ConflictException if tag name already exists for the business', async () => {
      mockRepository.findOne.mockResolvedValue(mockTag);

      await expect(
        service.create(mockBusiness, { name: mockTag.name }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'New Name' };

    it('should update and save the tag', async () => {
      const existingTag = { ...mockTag };
      mockRepository.findOne
        .mockResolvedValueOnce(existingTag) // for findOne
        .mockResolvedValueOnce(null); // for checking if name already exists

      mockRepository.save.mockResolvedValue({
        ...existingTag,
        name: updateDto.name,
      });

      const result = await service.update(mockBusiness, mockTag.id, updateDto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw ConflictException if trying to update to an existing tag name', async () => {
      const existingTag = { ...mockTag };
      mockRepository.findOne
        .mockResolvedValueOnce(existingTag) // for findOne
        .mockResolvedValueOnce({ id: 'different-uuid', name: 'ExistingTag' }); // for unique check

      await expect(
        service.update(mockBusiness, mockTag.id, { name: 'ExistingTag' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft remove the tag', async () => {
      mockRepository.findOne.mockResolvedValue(mockTag);
      mockRepository.softRemove.mockResolvedValue(mockTag);

      await service.remove(mockBusiness, mockTag.id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockTag.id, business_id: mockBusiness.id },
      });
      expect(repo.softRemove).toHaveBeenCalledWith(mockTag);
    });
  });
});
