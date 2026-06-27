import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from '@crm/entities/company.entity';
import { Tag } from '@crm/entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ListCompaniesDto } from './dto/list-companies.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
    @InjectRepository(Tag)
    private readonly tagsRepo: Repository<Tag>,
  ) {}

  async list(business: Business, query: ListCompaniesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.sector_type', 'st')
      .leftJoinAndSelect('e.lifecycle_stage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.business_id = :bid', { bid: business.id });

    if (query.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identification) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.sector_type_id) {
      qb.andWhere('e.sector_type_id = :stId', { stId: query.sector_type_id });
    }

    if (query.lifecycle_stage_id) {
      qb.andWhere('e.lifecycle_stage_id = :lsId', { lsId: query.lifecycle_stage_id });
    }

    qb.orderBy('e.name', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(business: Business, id: string): Promise<Company> {
    const company = await this.repo.findOne({
      where: { id, business_id: business.id },
      relations: ['sector_type', 'lifecycle_stage', 'tags'],
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(business: Business, dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.repo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing) throw new ConflictException('A company with this name already exists');

    const { tag_ids, ...rest } = dto;
    const company = this.repo.create({ ...rest, business_id: business.id });

    if (tag_ids?.length) {
      company.tags = await this.tagsRepo.findBy({
        id: In(tag_ids),
        business_id: business.id,
      });
    } else {
      company.tags = [];
    }

    return this.repo.save(company);
  }

  async update(business: Business, id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(business, id);

    if (dto.name && dto.name !== company.name) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing) throw new ConflictException('A company with this name already exists');
    }

    const { tag_ids, ...rest } = dto;
    Object.assign(company, rest);

    if (tag_ids !== undefined) {
      company.tags = tag_ids.length
        ? await this.tagsRepo.findBy({ id: In(tag_ids), business_id: business.id })
        : [];
    }

    return this.repo.save(company);
  }

  async remove(business: Business, id: string): Promise<void> {
    const company = await this.findOne(business, id);
    await this.repo.softRemove(company);
  }
}
