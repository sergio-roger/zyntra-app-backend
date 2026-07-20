import { Business } from '@auth/entities/business.entity';
import { CreateFormTemplateDto } from '@/modules/forms/dto/create-form-template.dto';
import { ReplaceFormFieldsDto } from '@/modules/forms/dto/replace-form-fields.dto';
import { UpdateFormTemplateDto } from '@/modules/forms/dto/update-form-template.dto';
import { FormField } from '@/modules/forms/entities/form-field.entity';
import { FormTemplate } from '@/modules/forms/entities/form-template.entity';
import { FormStatus } from '@/modules/forms/enums/form-status.enum';
import { FormPublicConfig } from '@/modules/forms/interfaces/form-public-config.interface';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class FormTemplatesService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templateRepo: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly fieldRepo: Repository<FormField>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(business: Business): Promise<FormTemplate[]> {
    return this.templateRepo.find({
      where: { businessId: business.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(business: Business, id: string): Promise<FormTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id, businessId: business.id },
    });
    if (!template) throw new NotFoundException('Formulario no encontrado');
    return template;
  }

  async findFields(
    business: Business,
    templateId: string,
  ): Promise<FormField[]> {
    await this.findOne(business, templateId); // valida pertenencia al negocio
    return this.findFieldsByTemplateId(templateId);
  }

  private async findFieldsByTemplateId(
    templateId: string,
  ): Promise<FormField[]> {
    return this.fieldRepo.find({
      where: { formTemplateId: templateId },
      order: { position: 'ASC' },
    });
  }

  /** Resuelve por slug público — sin sesión de staff, usada por los endpoints de /forms/public. */
  async findPublishedBySlug(
    businessId: string,
    slug: string,
  ): Promise<FormTemplate> {
    const template = await this.templateRepo.findOne({
      where: { businessId, slug, status: FormStatus.PUBLISHED },
    });
    if (!template) throw new NotFoundException('Formulario no encontrado');
    return template;
  }

  /** Config sanitizada para renderizar el formulario público (sin mapsTo ni ids internos). */
  async getPublicConfig(
    businessId: string,
    slug: string,
  ): Promise<FormPublicConfig> {
    const template = await this.findPublishedBySlug(businessId, slug);
    const fields = await this.findFieldsByTemplateId(template.id);

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      successMessage: template.successMessage,
      fields: fields.map((f) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
        placeholder: f.placeholder,
        validation: f.validation,
      })),
    };
  }

  async create(
    business: Business,
    dto: CreateFormTemplateDto,
  ): Promise<FormTemplate> {
    const existing = await this.templateRepo.findOne({
      where: { businessId: business.id, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Ya existe un formulario con este slug');
    }

    const template = this.templateRepo.create({
      ...dto,
      businessId: business.id,
    });
    return this.templateRepo.save(template);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateFormTemplateDto,
  ): Promise<FormTemplate> {
    const template = await this.findOne(business, id);

    if (dto.slug !== undefined && dto.slug !== template.slug) {
      const existing = await this.templateRepo.findOne({
        where: { businessId: business.id, slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Ya existe un formulario con este slug');
      }
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(business: Business, id: string): Promise<void> {
    const template = await this.findOne(business, id);
    await this.templateRepo.softRemove(template);
  }

  /** Reemplaza y reordena todos los campos de la plantilla en una transacción. */
  async replaceFields(
    business: Business,
    templateId: string,
    dto: ReplaceFormFieldsDto,
  ): Promise<FormField[]> {
    const template = await this.findOne(business, templateId);

    const keys = dto.fields.map((f) => f.fieldKey);
    if (new Set(keys).size !== keys.length) {
      throw new ConflictException(
        'fieldKey duplicado dentro de la misma plantilla',
      );
    }

    await this.dataSource.transaction(async (em) => {
      const existing = await em.find(FormField, {
        where: { formTemplateId: template.id },
      });

      const incomingIds = new Set(
        dto.fields.filter((f) => f.id).map((f) => f.id),
      );
      const toRemove = existing.filter((f) => !incomingIds.has(f.id));
      if (toRemove.length) await em.softRemove(toRemove);

      for (const [index, item] of dto.fields.entries()) {
        const current = item.id
          ? existing.find((f) => f.id === item.id)
          : undefined;

        if (current) {
          Object.assign(current, { ...item, position: index });
          await em.save(current);
        } else {
          const field = em.create(FormField, {
            ...item,
            formTemplateId: template.id,
            position: index,
          });
          await em.save(field);
        }
      }
    });

    return this.findFields(business, template.id);
  }
}
