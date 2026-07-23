import { Test, TestingModule } from '@nestjs/testing';
import { FormRateLimitGuard } from './guards/form-rate-limit.guard';
import { FormsPublicController } from './forms-public.controller';
import { FormSubmissionsService } from './form-submissions.service';
import { FormTemplatesService } from './form-templates.service';
import { SubmitFormDto } from './dto/submit-form.dto';

describe('FormsPublicController', () => {
  let controller: FormsPublicController;

  const mockTemplatesService = {
    getPublicConfig: jest.fn(),
  };
  const mockSubmissionsService = {
    submitPublic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormsPublicController],
      providers: [
        { provide: FormTemplatesService, useValue: mockTemplatesService },
        { provide: FormSubmissionsService, useValue: mockSubmissionsService },
      ],
    })
      .overrideGuard(FormRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormsPublicController>(FormsPublicController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  describe('getConfig', () => {
    it('delegates to templatesService.getPublicConfig with businessId/slug', async () => {
      const config = { id: 'template-uuid', name: 'Contacto', fields: [] };
      mockTemplatesService.getPublicConfig.mockResolvedValue(config);

      const result = await controller.getConfig('biz-uuid', 'contacto');

      expect(mockTemplatesService.getPublicConfig).toHaveBeenCalledWith(
        'biz-uuid',
        'contacto',
      );
      expect(result).toEqual(config);
    });
  });

  describe('submit', () => {
    it('delegates to submissionsService.submitPublic with businessId/slug/dto', async () => {
      const dto = { data: { email: 'a@a.com' } };
      const submissionResult = { submissionId: 'submission-uuid' };
      mockSubmissionsService.submitPublic.mockResolvedValue(submissionResult);

      const result = await controller.submit(
        'biz-uuid',
        'contacto',
        dto as SubmitFormDto,
      );

      expect(mockSubmissionsService.submitPublic).toHaveBeenCalledWith(
        'biz-uuid',
        'contacto',
        dto,
      );
      expect(result).toEqual(submissionResult);
    });
  });
});
