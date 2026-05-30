import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepo: Repository<Tag>,
  ) {}

  async findAll(business: Business): Promise<Tag[]> {
    return this.tagsRepo.find({
      where: { business_id: business.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<Tag> {
    const tag = await this.tagsRepo.findOne({
      where: { id, business_id: business.id },
    });
    if (!tag) throw new NotFoundException('Etiqueta no encontrada');
    return tag;
  }

  async create(business: Business, dto: CreateTagDto): Promise<Tag> {
    const existing = await this.tagsRepo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing) throw new ConflictException('Ya existe una etiqueta con este nombre');

    const tag = this.tagsRepo.create({
      ...dto,
      business_id: business.id,
    });
    return this.tagsRepo.save(tag);
  }

  async update(business: Business, id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(business, id);
    
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.tagsRepo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing) throw new ConflictException('Ya existe una etiqueta con este nombre');
    }

    Object.assign(tag, dto);
    return this.tagsRepo.save(tag);
  }

  async remove(business: Business, id: string): Promise<void> {
    const tag = await this.findOne(business, id);
    await this.tagsRepo.softRemove(tag);
  }
}
