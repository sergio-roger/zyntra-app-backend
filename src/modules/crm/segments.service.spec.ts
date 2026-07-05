import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SegmentsService } from './segments.service';
import { Segment } from './entities/segment.entity';
import { Contact } from './entities/contact.entity';
import { Business } from '@auth/entities/business.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockBusiness = {
  id: 'business-uuid-1234',
  name: 'Test Business',
} as Business;

const mockSegment = {
  id: 'segment-uuid-1',
  business_id: 'business-uuid-1234',
  name: 'WhatsApp Leads',
  description: 'Leads from WhatsApp source',
  conditions: [{ field: 'source', operator: 'equals', value: 'whatsapp' }],
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
} as Segment;

const mockSegmentResponse = {
  id: mockSegment.id,
  name: mockSegment.name,
  description: mockSegment.description,
  conditions: mockSegment.conditions,
  type: undefined,
  createdAt: mockSegment.created_at,
  updatedAt: mockSegment.updated_at,
};

describe('SegmentsService', () => {
  let service: SegmentsService;
  let repo: Repository<Segment>;

  const mockSegmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockContactRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SegmentsService,
        {
          provide: getRepositoryToken(Segment),
          useValue: mockSegmentRepository,
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: mockContactRepository,
        },
      ],
    }).compile();

    service = module.get<SegmentsService>(SegmentsService);
    repo = module.get<Repository<Segment>>(getRepositoryToken(Segment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all segments for a business ordered by name', async () => {
      const segmentsList = [mockSegment];
      mockSegmentRepository.find.mockResolvedValue(segmentsList);

      const result = await service.findAll(mockBusiness);

      expect(repo.find).toHaveBeenCalledWith({
        where: { business_id: mockBusiness.id },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockSegmentResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a segment if it exists and belongs to the business', async () => {
      mockSegmentRepository.findOne.mockResolvedValue(mockSegment);

      const result = await service.findOne(mockBusiness, 'segment-uuid-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'segment-uuid-1', business_id: mockBusiness.id },
      });
      expect(result).toEqual(mockSegmentResponse);
    });

    it('should throw NotFoundException if segment does not exist', async () => {
      mockSegmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockBusiness, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'WhatsApp Leads',
      description: 'Leads from WhatsApp',
      conditions: [{ field: 'source', operator: 'equals', value: 'whatsapp' }],
    };

    it('should create and save a new segment if name is unique', async () => {
      mockSegmentRepository.findOne.mockResolvedValue(null);
      mockSegmentRepository.create.mockReturnValue({
        ...createDto,
        business_id: mockBusiness.id,
      });
      mockSegmentRepository.save.mockResolvedValue({
        id: 'new-segment-uuid',
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

    it('should throw ConflictException if segment name already exists', async () => {
      mockSegmentRepository.findOne.mockResolvedValue(mockSegment);

      await expect(
        service.create(mockBusiness, {
          name: mockSegment.name,
          conditions: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'New WhatsApp' };

    it('should update and save the segment', async () => {
      const existingSegment = { ...mockSegment };
      mockSegmentRepository.findOne
        .mockResolvedValueOnce(existingSegment) // for findOne
        .mockResolvedValueOnce(null); // for checking if name already exists

      mockSegmentRepository.save.mockResolvedValue({
        ...existingSegment,
        name: updateDto.name,
      });

      const result = await service.update(
        mockBusiness,
        mockSegment.id,
        updateDto,
      );

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw ConflictException if trying to update to an existing segment name', async () => {
      const existingSegment = { ...mockSegment };
      mockSegmentRepository.findOne
        .mockResolvedValueOnce(existingSegment) // for findOne
        .mockResolvedValueOnce({
          id: 'different-uuid',
          name: 'ExistingSegment',
        }); // for unique check

      await expect(
        service.update(mockBusiness, mockSegment.id, {
          name: 'ExistingSegment',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft remove the segment', async () => {
      mockSegmentRepository.findOne.mockResolvedValue(mockSegment);
      mockSegmentRepository.softRemove.mockResolvedValue(mockSegment);

      await service.remove(mockBusiness, mockSegment.id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockSegment.id, business_id: mockBusiness.id },
      });
      expect(repo.softRemove).toHaveBeenCalledWith(mockSegment);
    });
  });
});
