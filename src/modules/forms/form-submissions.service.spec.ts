/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Business } from '@auth/entities/business.entity';
import { CompaniesService } from '@crm/companies.service';
import { ContactsService } from '@crm/contacts.service';
import { Company } from '@crm/entities/company.entity';
import { Contact } from '@crm/entities/contact.entity';
import { CustomField } from '@crm/entities/custom-field.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import { CustomFieldType } from '@crm/enums/custom-field-type.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FormField } from './entities/form-field.entity';
import { FormSubmission } from './entities/form-submission.entity';
import { FormTemplate } from './entities/form-template.entity';
import { FormSubmitAction } from './enums/form-submit-action.enum';
import { FormSubmissionsService } from './form-submissions.service';
import { FormTemplatesService } from './form-templates.service';

const mockBusiness = { id: 'biz-uuid' } as Business;

const makeField = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'field-uuid',
    formTemplateId: 'template-uuid',
    fieldKey: 'email',
    label: 'Email',
    type: CustomFieldType.TEXT,
    options: null,
    required: false,
    position: 0,
    mapsTo: 'contact.email',
    placeholder: null,
    validation: null,
    ...overrides,
  }) as FormField;

const makeTemplate = (overrides: Partial<FormTemplate> = {}): FormTemplate =>
  ({
    id: 'template-uuid',
    businessId: 'biz-uuid',
    slug: 'contacto',
    submitAction: FormSubmitAction.CREATE_CONTACT,
    successMessage: '¡Gracias!',
    ...overrides,
  }) as FormTemplate;

describe('FormSubmissionsService', () => {
  let service: FormSubmissionsService;

  const submissionRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: any) => ({ ...x, id: 'submission-uuid' })),
    findAndCount: jest.fn(),
  };
  const contactRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const companyRepo = {
    findOne: jest.fn(),
    save: jest.fn(<T>(x: T): Promise<T> => Promise.resolve(x)),
  };
  const customFieldRepo = {
    findOne: jest.fn(),
  };
  const businessRepo = {
    findOneBy: jest.fn(),
  };
  const formTemplatesService = {
    findOne: jest.fn(),
    findFields: jest.fn(),
    findPublishedBySlug: jest.fn(),
  };
  const contactsService = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const companiesService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormSubmissionsService,
        { provide: getRepositoryToken(FormSubmission), useValue: submissionRepo },
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(CustomField), useValue: customFieldRepo },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: FormTemplatesService, useValue: formTemplatesService },
        { provide: ContactsService, useValue: contactsService },
        { provide: CompaniesService, useValue: companiesService },
      ],
    }).compile();

    service = module.get<FormSubmissionsService>(FormSubmissionsService);
    jest.clearAllMocks();
  });

  describe('submit — mapeo contact.*', () => {
    it('crea un Contact nuevo cuando no existe uno con el mismo email', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
        makeField({ id: 'f2', fieldKey: 'name', mapsTo: 'contact.name', position: 1 }),
      ]);
      contactRepo.findOne.mockResolvedValue(null);
      contactsService.create.mockResolvedValue({ id: 'contact-uuid' });

      const result = await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com', name: 'Ana' },
      });

      expect(contactsService.create).toHaveBeenCalledWith(mockBusiness, {
        name: 'Ana',
        email: 'ana@example.com',
        phone: undefined,
        source: ContactSource.FORM,
        customFields: undefined,
      });
      expect(contactsService.update).not.toHaveBeenCalled();
      expect(result.contactId).toBe('contact-uuid');
      expect(result.successMessage).toBe('¡Gracias!');
      expect(submissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: 'contact-uuid' }),
      );
    });

    it('actualiza el Contact existente en vez de duplicarlo cuando el email ya existe', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
      ]);
      contactRepo.findOne.mockResolvedValue({
        id: 'existing-uuid',
        customFields: { plan: 'pro' },
      });
      contactsService.update.mockResolvedValue({ id: 'existing-uuid' });

      const result = await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com' },
      });

      expect(contactsService.update).toHaveBeenCalledWith(
        mockBusiness,
        'existing-uuid',
        {},
      );
      expect(contactsService.create).not.toHaveBeenCalled();
      expect(result.contactId).toBe('existing-uuid');
    });
  });

  describe('submit — contact.custom.<name>', () => {
    it('descarta el valor sin crashear cuando no existe un CustomField con ese name', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
        makeField({
          id: 'f2',
          fieldKey: 'nivel',
          mapsTo: 'contact.custom.nivel',
          position: 1,
        }),
      ]);
      contactRepo.findOne.mockResolvedValue(null);
      customFieldRepo.findOne.mockResolvedValue(null);
      contactsService.create.mockResolvedValue({ id: 'contact-uuid' });

      await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com', nivel: 'oro' },
      });

      expect(contactsService.create).toHaveBeenCalledWith(
        mockBusiness,
        expect.objectContaining({ customFields: undefined }),
      );
    });

    it('incluye el valor cuando sí existe el CustomField (contact, ese name)', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
        makeField({
          id: 'f2',
          fieldKey: 'nivel',
          mapsTo: 'contact.custom.nivel',
          position: 1,
        }),
      ]);
      contactRepo.findOne.mockResolvedValue(null);
      customFieldRepo.findOne.mockResolvedValue({
        businessId: 'biz-uuid',
        name: 'nivel',
        entityType: 'contact',
      });
      contactsService.create.mockResolvedValue({ id: 'contact-uuid' });

      await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com', nivel: 'oro' },
      });

      expect(contactsService.create).toHaveBeenCalledWith(
        mockBusiness,
        expect.objectContaining({ customFields: { nivel: 'oro' } }),
      );
    });
  });

  describe('submit — company.* y deal.value', () => {
    it('crea la Company y linkea companyId + dealValue al contacto vía update directo', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
        makeField({ id: 'f2', fieldKey: 'empresa', mapsTo: 'company.name', position: 1 }),
        makeField({ id: 'f3', fieldKey: 'monto', mapsTo: 'deal.value', position: 2 }),
      ]);
      contactRepo.findOne.mockResolvedValue(null);
      companyRepo.findOne.mockResolvedValue(null);
      companiesService.create.mockResolvedValue({ id: 'company-uuid' });
      contactsService.create.mockResolvedValue({ id: 'contact-uuid' });

      await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com', empresa: 'Acme', monto: '500' },
      });

      expect(companiesService.create).toHaveBeenCalledWith(mockBusiness, {
        name: 'Acme',
        website: undefined,
        customFields: undefined,
      });
      expect(contactRepo.update).toHaveBeenCalledWith('contact-uuid', {
        dealValue: 500,
        companyId: 'company-uuid',
      });
    });
  });

  describe('submit — ramas de submitAction', () => {
    it('webhook_only no toca el CRM pero persiste el submission', async () => {
      const template = makeTemplate({ submitAction: FormSubmitAction.WEBHOOK_ONLY });
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
      ]);

      const result = await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com' },
      });

      expect(contactsService.create).not.toHaveBeenCalled();
      expect(contactsService.update).not.toHaveBeenCalled();
      expect(result.contactId).toBeUndefined();
      expect(submissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: null, companyId: null }),
      );
    });

    it('custom no toca el CRM y no dispara side-effects', async () => {
      const template = makeTemplate({ submitAction: FormSubmitAction.CUSTOM });
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([]);

      await service.submit(mockBusiness, template.id, { data: {} });

      expect(contactsService.create).not.toHaveBeenCalled();
      expect(companiesService.create).not.toHaveBeenCalled();
    });
  });

  describe('submit — límite de plan excedido', () => {
    it('persiste igual el FormSubmission sin contactId cuando ContactsService.create rechaza', async () => {
      const template = makeTemplate();
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([
        makeField({ fieldKey: 'email', mapsTo: 'contact.email' }),
      ]);
      contactRepo.findOne.mockResolvedValue(null);
      contactsService.create.mockRejectedValue(
        new Error('Plan limit exceeded'),
      );

      const result = await service.submit(mockBusiness, template.id, {
        data: { email: 'ana@example.com' },
      });

      expect(result.contactId).toBeUndefined();
      expect(submissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: null }),
      );
    });
  });

  describe('submitPublic', () => {
    it('resuelve business y template publicado por slug antes de delegar en submit', async () => {
      const template = makeTemplate();
      businessRepo.findOneBy.mockResolvedValue(mockBusiness);
      formTemplatesService.findPublishedBySlug.mockResolvedValue(template);
      formTemplatesService.findOne.mockResolvedValue(template);
      formTemplatesService.findFields.mockResolvedValue([]);

      const result = await service.submitPublic(mockBusiness.id, template.slug, {
        data: {},
      });

      expect(businessRepo.findOneBy).toHaveBeenCalledWith({ id: mockBusiness.id });
      expect(formTemplatesService.findPublishedBySlug).toHaveBeenCalledWith(
        mockBusiness.id,
        template.slug,
      );
      expect(result.submissionId).toBe('submission-uuid');
    });

    it('lanza NotFoundException cuando el businessId no existe', async () => {
      businessRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.submitPublic('nope', 'contacto', { data: {} }),
      ).rejects.toThrow('Formulario no encontrado');
    });
  });
});
