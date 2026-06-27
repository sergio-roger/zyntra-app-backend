import { Business } from '@auth/entities/business.entity';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from '@crm/dto/custom-field.dto';
import { Company } from '@crm/entities/company.entity';
import { Contact } from '@crm/entities/contact.entity';
import { CustomField } from '@crm/entities/custom-field.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField)
    private readonly fieldRepo: Repository<CustomField>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async findAll(
    business: Business,
    entityType?: string,
  ): Promise<CustomField[]> {
    return this.fieldRepo.find({
      where: {
        business_id: business.id,
        ...(entityType ? { entity_type: entityType } : {}),
      },
      order: { created_at: 'ASC' },
    });
  }

  async create(
    business: Business,
    dto: CreateCustomFieldDto,
  ): Promise<CustomField> {
    const existing = await this.fieldRepo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing)
      throw new ConflictException('Ya existe un campo con este nombre técnico');

    const field = this.fieldRepo.create({
      ...dto,
      business_id: business.id,
    });
    return this.fieldRepo.save(field);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateCustomFieldDto,
  ): Promise<CustomField> {
    const field = await this.fieldRepo.findOne({
      where: { id, business_id: business.id },
    });
    if (!field) throw new NotFoundException('Campo no encontrado');

    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async remove(business: Business, id: string): Promise<void> {
    const field = await this.fieldRepo.findOne({
      where: { id, business_id: business.id },
    });
    if (!field) throw new NotFoundException('Campo no encontrado');

    if (field.entity_type === 'company') {
      const count = await this.companyRepo
        .createQueryBuilder('c')
        .where('c.business_id = :businessId', { businessId: business.id })
        .andWhere(
          `c.custom_fields->>:fieldName IS NOT NULL AND c.custom_fields->>:fieldName != ''`,
          { fieldName: field.name },
        )
        .getCount();
      if (count > 0) throw new ConflictException('field_has_data');
    } else {
      const count = await this.contactRepo
        .createQueryBuilder('c')
        .where('c.businessId = :businessId', { businessId: business.id })
        .andWhere(
          `c.custom_fields->>:fieldName IS NOT NULL AND c.custom_fields->>:fieldName != ''`,
          { fieldName: field.name },
        )
        .getCount();
      if (count > 0) throw new ConflictException('field_has_data');
    }

    await this.fieldRepo.softRemove(field);
  }
}
