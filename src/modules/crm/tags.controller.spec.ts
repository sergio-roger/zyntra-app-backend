import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { RolesGuard } from '@common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { Business } from '@auth/entities/business.entity';
import { Tag } from './entities/tag.entity';
import { UserRole } from '@crm/enums/user-role.enum';

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
        { provide: TagsService, useValue: mockTagsService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  describe('findAll', () => {
    it('should call tagsService.findAll with the current business', async () => {
      mockTagsService.findAll.mockResolvedValue([mockTag]);
      const result = await controller.findAll(mockBusiness);
      expect(service.findAll).toHaveBeenCalledWith(mockBusiness, undefined);
      expect(result).toEqual([mockTag]);
    });

    it('should call tagsService.findAll with current business and entityType', async () => {
      mockTagsService.findAll.mockResolvedValue([mockTag]);
      const result = await controller.findAll(mockBusiness, 'company');
      expect(service.findAll).toHaveBeenCalledWith(mockBusiness, 'company');
      expect(result).toEqual([mockTag]);
    });
  });

  describe('create', () => {
    it('should call tagsService.create', async () => {
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
    it('should call tagsService.update', async () => {
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
    it('should call tagsService.remove', async () => {
      mockTagsService.remove.mockResolvedValue(undefined);
      await controller.remove(mockBusiness, 'tag-uuid-1');
      expect(service.remove).toHaveBeenCalledWith(mockBusiness, 'tag-uuid-1');
    });
  });
});

describe('TagsController — RBAC metadata', () => {
  it('findAll has no role restriction (all authenticated)', () => {
    const roles = Reflect.getMetadata(
      'roles',
      TagsController.prototype.findAll,
    ) as UserRole[] | undefined;
    expect(roles).toBeUndefined();
  });

  it('create requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      TagsController.prototype.create,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
    expect(roles).not.toContain(UserRole.AGENT);
  });

  it('update requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      TagsController.prototype.update,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
  });

  it('remove requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      TagsController.prototype.remove,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
  });
});
