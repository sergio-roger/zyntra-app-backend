import { Business } from '@auth/entities/business.entity';
import { CompaniesService } from '@crm/companies.service';
import { ContactsService } from '@crm/contacts.service';
import { Company } from '@crm/entities/company.entity';
import { Contact } from '@crm/entities/contact.entity';
import { CustomField } from '@crm/entities/custom-field.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import {
  COMPANY_DIRECT_FIELDS,
  CONTACT_DIRECT_FIELDS,
  CONTACT_JSONB_FALLBACK_FIELDS,
  FORM_MAPPING_COMPANY_PREFIX,
  FORM_MAPPING_CONTACT_PREFIX,
  FORM_MAPPING_CUSTOM_SEGMENT,
  FORM_MAPPING_DEAL_VALUE,
} from '@/modules/forms/constants/form-field-mapping.constants';
import { SubmitFormDto } from '@/modules/forms/dto/submit-form.dto';
import { FormField } from '@/modules/forms/entities/form-field.entity';
import { FormSubmission } from '@/modules/forms/entities/form-submission.entity';
import { FormSubmitAction } from '@/modules/forms/enums/form-submit-action.enum';
import { FormSubmissionResult } from '@/modules/forms/interfaces/form-submission-result.interface';
import { ParsedFieldMappings } from '@/modules/forms/interfaces/parsed-field-mappings.interface';
import { FormTemplatesService } from '@/modules/forms/form-templates.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FormSubmissionsService {
  private readonly logger = new Logger(FormSubmissionsService.name);

  constructor(
    @InjectRepository(FormSubmission)
    private readonly submissionRepo: Repository<FormSubmission>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CustomField)
    private readonly customFieldRepo: Repository<CustomField>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly formTemplatesService: FormTemplatesService,
    private readonly contactsService: ContactsService,
    private readonly companiesService: CompaniesService,
  ) {}

  /** Punto de entrada público (sin sesión de staff) — resuelve businessId/slug antes de delegar en submit(). */
  async submitPublic(
    businessId: string,
    slug: string,
    dto: SubmitFormDto,
  ): Promise<FormSubmissionResult> {
    const business = await this.businessRepo.findOneBy({ id: businessId });
    if (!business) throw new NotFoundException('Formulario no encontrado');

    const template = await this.formTemplatesService.findPublishedBySlug(
      businessId,
      slug,
    );
    return this.submit(business, template.id, dto);
  }

  async submit(
    business: Business,
    templateId: string,
    dto: SubmitFormDto,
  ): Promise<FormSubmissionResult> {
    const template = await this.formTemplatesService.findOne(
      business,
      templateId,
    );
    const fields = await this.formTemplatesService.findFields(
      business,
      template.id,
    );

    const mappings = await this.parseFieldMappings(business, fields, dto.data);

    let contactId: string | undefined;
    let companyId: string | undefined;

    const shouldCreateCrmRecords =
      template.submitAction === FormSubmitAction.CREATE_CONTACT ||
      template.submitAction === FormSubmitAction.CREATE_LEAD;

    if (shouldCreateCrmRecords) {
      try {
        if (Object.keys(mappings.companyData).length) {
          companyId = await this.upsertCompany(business, mappings);
        }
        contactId = await this.upsertContact(business, mappings, companyId);
      } catch (err) {
        // No perder el envío por un límite de plan u otra validación del CRM —
        // el FormSubmission igual se persiste, solo sin contactId/companyId.
        this.logger.warn(
          `No se pudo crear/actualizar Contact/Company del submit de "${template.slug}": ${(err as Error).message}`,
        );
      }
    }
    // 'webhook_only': TODO disparar webhook configurado — no implementado aún.
    // 'custom': sin side-effects, lo consume Workflows más adelante.

    const submission = this.submissionRepo.create({
      formTemplateId: template.id,
      businessId: business.id,
      data: dto.data,
      contactId: contactId ?? null,
      companyId: companyId ?? null,
      sourceChannel: dto.sourceChannel ?? null,
    });
    const saved = await this.submissionRepo.save(submission);

    return {
      submissionId: saved.id,
      contactId,
      companyId,
      successMessage: template.successMessage ?? undefined,
    };
  }

  async listSubmissions(
    business: Business,
    templateId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: FormSubmission[]; total: number; page: number; limit: number }> {
    await this.formTemplatesService.findOne(business, templateId); // valida pertenencia

    const [items, total] = await this.submissionRepo.findAndCount({
      where: { formTemplateId: templateId, businessId: business.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  // ---------------------------------------------------------------------------
  // Mapeo de mapsTo -> datos de Contact/Company
  // ---------------------------------------------------------------------------

  private async parseFieldMappings(
    business: Business,
    fields: FormField[],
    data: Record<string, unknown>,
  ): Promise<ParsedFieldMappings> {
    const result: ParsedFieldMappings = {
      contactData: {},
      contactCustomFields: {},
      companyData: {},
      companyCustomFields: {},
    };

    for (const field of fields) {
      if (!field.mapsTo) continue;
      const value = data[field.fieldKey];
      if (value === undefined || value === null || value === '') continue;

      if (field.mapsTo === FORM_MAPPING_DEAL_VALUE) {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) result.contactData.dealValue = numeric;
        continue;
      }

      if (field.mapsTo.startsWith(FORM_MAPPING_CONTACT_PREFIX)) {
        const rest = field.mapsTo.slice(FORM_MAPPING_CONTACT_PREFIX.length);
        if (rest.startsWith(FORM_MAPPING_CUSTOM_SEGMENT)) {
          const customName = rest.slice(FORM_MAPPING_CUSTOM_SEGMENT.length);
          await this.assignCustomField(
            business,
            'contact',
            customName,
            value,
            result.contactCustomFields,
          );
        } else if (
          (CONTACT_DIRECT_FIELDS as readonly string[]).includes(rest)
        ) {
          (result.contactData as Record<string, unknown>)[rest] = value;
        } else if (
          (CONTACT_JSONB_FALLBACK_FIELDS as readonly string[]).includes(rest)
        ) {
          result.contactCustomFields[rest] = value;
        }
        continue;
      }

      if (field.mapsTo.startsWith(FORM_MAPPING_COMPANY_PREFIX)) {
        const rest = field.mapsTo.slice(FORM_MAPPING_COMPANY_PREFIX.length);
        if (rest.startsWith(FORM_MAPPING_CUSTOM_SEGMENT)) {
          const customName = rest.slice(FORM_MAPPING_CUSTOM_SEGMENT.length);
          await this.assignCustomField(
            business,
            'company',
            customName,
            value,
            result.companyCustomFields,
          );
        } else if (
          (COMPANY_DIRECT_FIELDS as readonly string[]).includes(rest)
        ) {
          (result.companyData as Record<string, unknown>)[rest] = value;
        }
        continue;
      }
    }

    return result;
  }

  private async assignCustomField(
    business: Business,
    entityType: 'contact' | 'company',
    name: string,
    value: unknown,
    target: Record<string, unknown>,
  ): Promise<void> {
    const customField = await this.customFieldRepo.findOne({
      where: { businessId: business.id, name, entityType },
    });
    if (!customField) {
      this.logger.warn(
        `mapsTo referencia un CustomField inexistente: ${entityType}.custom.${name} (business ${business.id})`,
      );
      return;
    }
    target[name] = value;
  }

  // ---------------------------------------------------------------------------
  // Upsert de Contact/Company (por email / nombre) para no duplicar en submits repetidos
  // ---------------------------------------------------------------------------

  private async upsertContact(
    business: Business,
    mappings: ParsedFieldMappings,
    companyId: string | undefined,
  ): Promise<string | undefined> {
    const { email, name, phone, dealValue } = mappings.contactData;
    if (!email && !name) return undefined;

    const customFields = Object.keys(mappings.contactCustomFields).length
      ? mappings.contactCustomFields
      : undefined;

    const existing = email
      ? await this.contactRepo.findOne({
          where: { businessId: business.id, email },
        })
      : null;

    let contact: Contact;
    if (existing) {
      contact = await this.contactsService.update(business, existing.id, {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(customFields
          ? { customFields: { ...existing.customFields, ...customFields } }
          : {}),
      });
    } else {
      contact = await this.contactsService.create(business, {
        name: name ?? email ?? 'Sin nombre',
        email,
        phone,
        source: ContactSource.FORM,
        customFields,
      });
    }

    // dealValue y companyId no son parte de Create/UpdateContactDto — se
    // asignan directo sobre la columna para no ampliar esos DTOs solo por
    // este caso de uso interno.
    const extra: Partial<Pick<Contact, 'dealValue' | 'companyId'>> = {};
    if (dealValue !== undefined) extra.dealValue = dealValue;
    if (companyId) extra.companyId = companyId;
    if (Object.keys(extra).length) {
      await this.contactRepo.update(contact.id, extra);
    }

    return contact.id;
  }

  private async upsertCompany(
    business: Business,
    mappings: ParsedFieldMappings,
  ): Promise<string | undefined> {
    const { name, website } = mappings.companyData;
    if (!name) return undefined;

    const customFields = Object.keys(mappings.companyCustomFields).length
      ? mappings.companyCustomFields
      : undefined;

    const existing = await this.companyRepo.findOne({
      where: { businessId: business.id, name },
    });

    if (existing) {
      if (website) existing.website = website;
      if (customFields) {
        existing.customFields = { ...existing.customFields, ...customFields };
      }
      const saved = await this.companyRepo.save(existing);
      return saved.id;
    }

    const company = await this.companiesService.create(business, {
      name,
      website,
      customFields,
    });
    return company.id;
  }
}
