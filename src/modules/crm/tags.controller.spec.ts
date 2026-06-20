import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Business } from '@auth/entities/business.entity';
import { Tag } from './entities/tag.entity';

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
} as Tag;

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTagsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call tagsService.findAll with the current business', async () => {
      const tagsList = [mockTag];
      mockTagsService.findAll.mockResolvedValue(tagsList);

      const result = await controller.findAll(mockBusiness);

      expect(service.findAll).toHaveBeenCalledWith(mockBusiness);
      expect(result).toEqual(tagsList);
    });
  });

  describe('create', () => {
    it('should call tagsService.create with current business and dto', async () => {
      const createDto = { name: 'Support', color: '#f59e0b' };
      mockTagsService.create.mockResolvedValue({
        id: 'new-uuid',
        ...createDto,
        business_id: mockBusiness.id,
      });

      const result = await controller.create(mockBusiness, createDto);

      expect(service.create).toHaveBeenCalledWith(mockBusiness, createDto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('should call tagsService.update with current business, id, and dto', async () => {
      const updateDto = { name: 'Support Tier 1' };
      mockTagsService.update.mockResolvedValue({
        ...mockTag,
        name: updateDto.name,
      });

      const result = await controller.update(
        mockBusiness,
        'tag-uuid-1',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockBusiness,
        'tag-uuid-1',
        updateDto,
      );
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should call tagsService.remove with current business and id', async () => {
      mockTagsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockBusiness, 'tag-uuid-1');

      expect(service.remove).toHaveBeenCalledWith(mockBusiness, 'tag-uuid-1');
      expect(result).toBeUndefined();
    });
  });
});
