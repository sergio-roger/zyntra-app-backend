import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '@crm/entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateTagDto } from '@crm/dto/create-tag.dto';
import { UpdateTagDto } from '@crm/dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepo: Repository<Tag>,
  ) {}

  async findAll(business: Business, entityType?: string): Promise<Tag[]> {
    const where: Record<string, string> = { businessId: business.id };
    if (entityType) {
      where.entityType = entityType;
    }
    return this.tagsRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<Tag> {
    const tag = await this.tagsRepo.findOne({
      where: { id, businessId: business.id },
    });
    if (!tag) throw new NotFoundException('Etiqueta no encontrada');
    return tag;
  }

  async create(business: Business, dto: CreateTagDto): Promise<Tag> {
    const existing = await this.tagsRepo.findOne({
      where: { businessId: business.id, name: dto.name },
    });
    if (existing)
      throw new ConflictException('Ya existe una etiqueta con este nombre');

    const tag = this.tagsRepo.create({
      name: dto.name,
      color: dto.color,
      description: dto.description,
      entityType: dto.entity_type,
      businessId: business.id,
    });
    return this.tagsRepo.save(tag);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateTagDto,
  ): Promise<Tag> {
    const tag = await this.findOne(business, id);

    if (dto.name && dto.name !== tag.name) {
      const existing = await this.tagsRepo.findOne({
        where: { businessId: business.id, name: dto.name },
      });
      if (existing)
        throw new ConflictException('Ya existe una etiqueta con este nombre');
    }

    if (dto.name !== undefined) tag.name = dto.name;
    if (dto.color !== undefined) tag.color = dto.color;
    if (dto.description !== undefined) tag.description = dto.description;
    if (dto.entity_type !== undefined) tag.entityType = dto.entity_type;

    return this.tagsRepo.save(tag);
  }

  async remove(business: Business, id: string): Promise<void> {
    const tag = await this.findOne(business, id);
    await this.tagsRepo.softRemove(tag);
  }
}
