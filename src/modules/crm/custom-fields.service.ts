import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomField } from './entities/custom-field.entity';
import { Business } from '@auth/entities/business.entity';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField)
    private readonly fieldRepo: Repository<CustomField>,
  ) {}

  async findAll(business: Business): Promise<CustomField[]> {
    return this.fieldRepo.find({
      where: { business_id: business.id },
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
    await this.fieldRepo.softRemove(field);
  }
}
