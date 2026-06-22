import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Segment } from './entities/segment.entity';
import { Contact } from './entities/contact.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findAll(business: Business): Promise<Segment[]> {
    return this.segmentRepo.find({
      where: { business_id: business.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<Segment> {
    const segment = await this.segmentRepo.findOne({
      where: { id, business_id: business.id },
    });
    if (!segment) throw new NotFoundException('Segmento no encontrado');
    return segment;
  }

  async create(business: Business, dto: CreateSegmentDto): Promise<Segment> {
    const existing = await this.segmentRepo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Ya existe un segmento con este nombre');
    }

    const segment = this.segmentRepo.create({
      ...dto,
      business_id: business.id,
    });
    return this.segmentRepo.save(segment);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateSegmentDto,
  ): Promise<Segment> {
    const segment = await this.findOne(business, id);

    if (dto.name && dto.name !== segment.name) {
      const existing = await this.segmentRepo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Ya existe un segmento con este nombre');
      }
    }

    Object.assign(segment, dto);
    return this.segmentRepo.save(segment);
  }

  async remove(business: Business, id: string): Promise<void> {
    const segment = await this.findOne(business, id);
    await this.segmentRepo.softRemove(segment);
  }

  buildQueryForConditions(
    businessId: string,
    conditions: any[],
  ): SelectQueryBuilder<Contact> {
    const query = this.contactRepo
      .createQueryBuilder('contact')
      .where('contact.business_id = :businessId', { businessId })
      .andWhere('contact.deleted_at IS NULL')
      .andWhere('contact.is_archived = false');

    if (!conditions || conditions.length === 0) {
      return query;
    }

    conditions.forEach((cond, index) => {
      const { field, operator, value } = cond;
      if (!field || !operator) return;
      const paramKey = `val_${index}`;

      if (field === 'tags') {
        query.leftJoin('contact.tags', `tag_${index}`);
        if (operator === 'equals' || operator === 'contains') {
          query.andWhere(
            `(tag_${index}.name = :${paramKey} OR tag_${index}.id = :${paramKey})`,
            { [paramKey]: value },
          );
        } else if (operator === 'in') {
          query.andWhere(
            `(tag_${index}.name IN (:...${paramKey}) OR tag_${index}.id IN (:...${paramKey}))`,
            { [paramKey]: value },
          );
        }
        return;
      }

      if (field.startsWith('custom_fields.')) {
        const customFieldKey = field.split('.')[1];
        const jsonbPath = `contact.custom_fields ->> :cf_key_${index}`;
        const params: any = { [`cf_key_${index}`]: customFieldKey };

        if (operator === 'equals') {
          query.andWhere(`${jsonbPath} = :${paramKey}`, {
            ...params,
            [paramKey]: value,
          });
        } else if (operator === 'contains') {
          query.andWhere(`${jsonbPath} ILIKE :${paramKey}`, {
            ...params,
            [paramKey]: `%${value}%`,
          });
        } else if (operator === 'greater_than') {
          query.andWhere(`CAST(${jsonbPath} AS NUMERIC) > :${paramKey}`, {
            ...params,
            [paramKey]: Number(value),
          });
        } else if (operator === 'less_than') {
          query.andWhere(`CAST(${jsonbPath} AS NUMERIC) < :${paramKey}`, {
            ...params,
            [paramKey]: Number(value),
          });
        }
        return;
      }

      const dbField = `contact.${field}`;
      if (operator === 'equals') {
        query.andWhere(`${dbField} = :${paramKey}`, { [paramKey]: value });
      } else if (operator === 'not_equals') {
        query.andWhere(`${dbField} != :${paramKey}`, { [paramKey]: value });
      } else if (operator === 'contains') {
        query.andWhere(`${dbField} ILIKE :${paramKey}`, {
          [paramKey]: `%${value}%`,
        });
      } else if (operator === 'greater_than') {
        query.andWhere(`${dbField} > :${paramKey}`, { [paramKey]: value });
      } else if (operator === 'less_than') {
        query.andWhere(`${dbField} < :${paramKey}`, { [paramKey]: value });
      } else if (operator === 'in') {
        query.andWhere(`${dbField} IN (:...${paramKey})`, {
          [paramKey]: value,
        });
      } else if (operator === 'is_empty') {
        query.andWhere(`(${dbField} IS NULL OR ${dbField} = '')`);
      } else if (operator === 'is_not_empty') {
        query.andWhere(`(${dbField} IS NOT NULL AND ${dbField} != '')`);
      }
    });

    return query;
  }

  async getSegmentContacts(
    business: Business,
    segmentId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Contact[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const segment = await this.findOne(business, segmentId);
    return this.previewContacts(business, segment.conditions, page, limit);
  }

  async previewContacts(
    business: Business,
    conditions: any[],
    page = 1,
    limit = 20,
  ): Promise<{
    items: Contact[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = this.buildQueryForConditions(business.id, conditions);

    // Order and Pagination
    query.orderBy('contact.created_at', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
