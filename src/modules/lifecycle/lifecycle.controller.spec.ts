import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import { Business } from '@auth/entities/business.entity';
import { LifecycleStage } from './entities/lifecycle-stage.entity';

const mockBusiness = {
  id: 'business-uuid-1234',
  name: 'Test Business',
} as Business;

const mockStage = {
  id: 'stage-uuid-1',
  business_id: 'business-uuid-1234',
  name: 'New Lead',
  position: 0,
} as LifecycleStage;

describe('LifecycleController', () => {
  let controller: LifecycleController;
  let service: LifecycleService;

  const mockLifecycleService = {
    findAll: jest.fn(),
    updateStages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifecycleController],
      providers: [
        {
          provide: LifecycleService,
          useValue: mockLifecycleService,
        },
      ],
    }).compile();

    controller = module.get<LifecycleController>(LifecycleController);
    service = module.get<LifecycleService>(LifecycleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call lifecycleService.findAll with current business id', async () => {
      const stagesList = [mockStage];
      mockLifecycleService.findAll.mockResolvedValue(stagesList);

      const result = await controller.findAll(mockBusiness);

      expect(service.findAll).toHaveBeenCalledWith(mockBusiness.id);
      expect(result).toEqual(stagesList);
    });
  });

  describe('update', () => {
    it('should call lifecycleService.updateStages with current business id and input stages list', async () => {
      const stagesInput = [{ name: 'Contacted' }];
      const stagesOutput = [
        { id: 'new-uuid', name: 'Contacted', position: 0 } as LifecycleStage,
      ];
      mockLifecycleService.updateStages.mockResolvedValue(stagesOutput);

      const result = await controller.update(mockBusiness, stagesInput);

      expect(service.updateStages).toHaveBeenCalledWith(
        mockBusiness.id,
        stagesInput,
      );
      expect(result).toEqual(stagesOutput);
    });
  });
});
