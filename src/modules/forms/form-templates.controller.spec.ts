import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { RolesGuard } from '@common/guards/roles.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';
import { FormSubmissionsService } from './form-submissions.service';
import { FormStatus } from './enums/form-status.enum';

const mockBusiness = { id: 'biz-uuid' } as Business;

const mockTemplate = {
  id: 'template-uuid',
  businessId: 'biz-uuid',
  name: 'Contacto',
  slug: 'contacto',
  status: FormStatus.DRAFT,
};

describe('FormTemplatesController', () => {
  let controller: FormTemplatesController;
  let templatesService: FormTemplatesService;
  let submissionsService: FormSubmissionsService;

  const mockTemplatesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findFields: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    replaceFields: jest.fn(),
  };
  const mockSubmissionsService = {
    listSubmissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormTemplatesController],
      providers: [
        { provide: FormTemplatesService, useValue: mockTemplatesService },
        { provide: FormSubmissionsService, useValue: mockSubmissionsService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormTemplatesController>(FormTemplatesController);
    templatesService = module.get<FormTemplatesService>(FormTemplatesService);
    submissionsService = module.get<FormSubmissionsService>(
      FormSubmissionsService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  describe('findAll', () => {
    it('calls templatesService.findAll with the current business', async () => {
      mockTemplatesService.findAll.mockResolvedValue([mockTemplate]);
      const result = await controller.findAll(mockBusiness);
      expect(templatesService.findAll).toHaveBeenCalledWith(mockBusiness);
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('findOne', () => {
    it('merges the template with its ordered fields', async () => {
      mockTemplatesService.findOne.mockResolvedValue(mockTemplate);
      mockTemplatesService.findFields.mockResolvedValue([{ fieldKey: 'email' }]);

      const result = await controller.findOne(mockBusiness, mockTemplate.id);

      expect(templatesService.findOne).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
      );
      expect(templatesService.findFields).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
      );
      expect(result).toEqual({ ...mockTemplate, fields: [{ fieldKey: 'email' }] });
    });
  });

  describe('create', () => {
    it('calls templatesService.create', async () => {
      const dto = { name: 'Contacto', slug: 'contacto' };
      mockTemplatesService.create.mockResolvedValue({ id: 'new-uuid', ...dto });

      const result = await controller.create(mockBusiness, dto as any);

      expect(templatesService.create).toHaveBeenCalledWith(mockBusiness, dto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('calls templatesService.update', async () => {
      const dto = { name: 'Nuevo nombre' };
      mockTemplatesService.update.mockResolvedValue({
        ...mockTemplate,
        ...dto,
      });

      const result = await controller.update(
        mockBusiness,
        mockTemplate.id,
        dto as any,
      );

      expect(templatesService.update).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
        dto,
      );
      expect(result.name).toBe(dto.name);
    });
  });

  describe('remove', () => {
    it('calls templatesService.remove', async () => {
      mockTemplatesService.remove.mockResolvedValue(undefined);
      await controller.remove(mockBusiness, mockTemplate.id);
      expect(templatesService.remove).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
      );
    });
  });

  describe('replaceFields', () => {
    it('calls templatesService.replaceFields', async () => {
      const dto = { fields: [] };
      mockTemplatesService.replaceFields.mockResolvedValue([]);

      const result = await controller.replaceFields(
        mockBusiness,
        mockTemplate.id,
        dto as any,
      );

      expect(templatesService.replaceFields).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
        dto,
      );
      expect(result).toEqual([]);
    });
  });

  describe('listSubmissions', () => {
    it('calls submissionsService.listSubmissions', async () => {
      const page = { items: [], total: 0, page: 1, limit: 20 };
      mockSubmissionsService.listSubmissions.mockResolvedValue(page);

      const result = await controller.listSubmissions(
        mockBusiness,
        mockTemplate.id,
        1,
        20,
      );

      expect(submissionsService.listSubmissions).toHaveBeenCalledWith(
        mockBusiness,
        mockTemplate.id,
        1,
        20,
      );
      expect(result).toEqual(page);
    });
  });
});

describe('FormTemplatesController — RBAC metadata', () => {
  it('findAll and findOne have no role restriction (all authenticated)', () => {
    expect(
      Reflect.getMetadata('roles', FormTemplatesController.prototype.findAll),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata('roles', FormTemplatesController.prototype.findOne),
    ).toBeUndefined();
  });

  it('create requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      FormTemplatesController.prototype.create,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
    expect(roles).not.toContain(UserRole.AGENT);
  });

  it('update requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      FormTemplatesController.prototype.update,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
  });

  it('remove requires ADMIN only', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      FormTemplatesController.prototype.remove,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).not.toContain(UserRole.MANAGER);
  });

  it('replaceFields requires ADMIN or MANAGER', () => {
    const roles: UserRole[] = Reflect.getMetadata(
      'roles',
      FormTemplatesController.prototype.replaceFields,
    ) as UserRole[];
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.MANAGER);
  });
});
