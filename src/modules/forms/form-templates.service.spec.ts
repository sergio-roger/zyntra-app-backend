/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Business } from '@auth/entities/business.entity';
import { CustomFieldType } from '@crm/enums/custom-field-type.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FormField } from './entities/form-field.entity';
import { FormTemplate } from './entities/form-template.entity';
import { FormStatus } from './enums/form-status.enum';
import { FormTemplatesService } from './form-templates.service';

const mockBusiness = { id: 'biz-uuid' } as Business;

const makeTemplate = (overrides: Partial<FormTemplate> = {}): FormTemplate =>
  ({
    id: 'template-uuid',
    businessId: 'biz-uuid',
    name: 'Contacto',
    slug: 'contacto',
    status: FormStatus.DRAFT,
    ...overrides,
  }) as FormTemplate;

describe('FormTemplatesService', () => {
  let service: FormTemplatesService;

  const templateRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(<T>(x: T): T => x),
    save: jest.fn(<T>(x: T): Promise<T> => Promise.resolve(x)),
    softRemove: jest.fn(),
  };
  const fieldRepo = {
    find: jest.fn(),
  };
  const em = {
    find: jest.fn(),
    softRemove: jest.fn(),
    save: jest.fn(<T>(x: T): Promise<T> => Promise.resolve(x)),
    create: jest.fn((_entity: unknown, data: unknown) => data),
  };
  const dataSource = {
    transaction: jest.fn((cb: (em: unknown) => unknown) => cb(em)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormTemplatesService,
        { provide: getRepositoryToken(FormTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(FormField), useValue: fieldRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<FormTemplatesService>(FormTemplatesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates when the slug is not taken', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      const dto = { name: 'Contacto', slug: 'contacto' };
      const result = await service.create(mockBusiness, dto as any);

      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { businessId: mockBusiness.id, slug: dto.slug },
      });
      expect(result).toMatchObject({
        name: 'Contacto',
        slug: 'contacto',
        businessId: mockBusiness.id,
      });
    });

    it('throws ConflictException when the slug already exists', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate());

      await expect(
        service.create(mockBusiness, { name: 'x', slug: 'contacto' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockBusiness, 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ConflictException when the new slug collides with another template', async () => {
      const template = makeTemplate();
      templateRepo.findOne
        .mockResolvedValueOnce(template) // lookup inside findOne()
        .mockResolvedValueOnce(
          makeTemplate({ id: 'other', slug: 'nuevo-slug' }),
        ); // collision check

      await expect(
        service.update(mockBusiness, template.id, {
          slug: 'nuevo-slug',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('updates fields when there is no slug collision', async () => {
      const template = makeTemplate();
      templateRepo.findOne.mockResolvedValueOnce(template);

      const result = await service.update(mockBusiness, template.id, {
        name: 'Nuevo nombre',
      } as any);

      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('remove', () => {
    it('soft-removes the template', async () => {
      const template = makeTemplate();
      templateRepo.findOne.mockResolvedValue(template);

      await service.remove(mockBusiness, template.id);

      expect(templateRepo.softRemove).toHaveBeenCalledWith(template);
    });
  });

  describe('replaceFields', () => {
    it('rejects duplicate fieldKeys within the same request', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate());
      const dto = {
        fields: [
          { fieldKey: 'email', label: 'Email', type: CustomFieldType.TEXT },
          { fieldKey: 'email', label: 'Email 2', type: CustomFieldType.TEXT },
        ],
      };

      await expect(
        service.replaceFields(mockBusiness, 'template-uuid', dto as any),
      ).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('removes fields absent from the payload and creates/updates the rest with position by array index', async () => {
      const template = makeTemplate();
      templateRepo.findOne.mockResolvedValue(template);

      const existingField = {
        id: 'field-1',
        formTemplateId: template.id,
        fieldKey: 'old_field',
      };
      em.find.mockResolvedValue([existingField]);
      fieldRepo.find.mockResolvedValue([
        { fieldKey: 'email', position: 0 },
        { fieldKey: 'phone', position: 1 },
      ]);

      const dto = {
        fields: [
          { fieldKey: 'email', label: 'Email', type: CustomFieldType.TEXT },
          { fieldKey: 'phone', label: 'Teléfono', type: CustomFieldType.TEXT },
        ],
      };

      const result = await service.replaceFields(
        mockBusiness,
        template.id,
        dto as any,
      );

      expect(em.softRemove).toHaveBeenCalledWith([existingField]);
      expect(em.save).toHaveBeenCalledTimes(2);
      expect(result.map((f) => f.fieldKey)).toEqual(['email', 'phone']);
    });
  });
});
