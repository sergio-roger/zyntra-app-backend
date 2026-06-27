import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { stringify } from 'csv-stringify/sync';
import { Company } from '@crm/entities/company.entity';
import { Tag } from '@crm/entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ListCompaniesDto } from './dto/list-companies.dto';
import {
  ExportCompaniesDto,
  ExportCompanyColumnDto,
  ImportCompanyRowDto,
} from './dto/export-companies.dto';

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
      .leftJoinAndSelect('e.industry', 'st')
      .leftJoinAndSelect('e.lifecycle_stage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.business_id = :bid', { bid: business.id });

    if (query.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identification) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.industry_id) {
      qb.andWhere('e.industry_id = :stId', { stId: query.industry_id });
    }

    if (query.lifecycle_stage_id) {
      qb.andWhere('e.lifecycle_stage_id = :lsId', {
        lsId: query.lifecycle_stage_id,
      });
    }

    qb.orderBy('e.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

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
      relations: ['industry', 'lifecycle_stage', 'tags', 'owner'],
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(business: Business, dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.repo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing)
      throw new ConflictException('A company with this name already exists');

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

  async update(
    business: Business,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(business, id);

    if (dto.name && dto.name !== company.name) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing)
        throw new ConflictException('A company with this name already exists');
    }

    const { tag_ids, ...rest } = dto;
    Object.assign(company, rest);

    if (tag_ids !== undefined) {
      company.tags = tag_ids.length
        ? await this.tagsRepo.findBy({
            id: In(tag_ids),
            business_id: business.id,
          })
        : [];
    }

    return this.repo.save(company);
  }

  async remove(business: Business, id: string): Promise<void> {
    const company = await this.findOne(business, id);
    await this.repo.softRemove(company);
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private getColumnValue(company: Company, col: ExportCompanyColumnDto): string {
    switch (col.key) {
      case 'identification':
        return company.identification ?? '';
      case 'website':
        return company.website ?? '';
      case 'employee_range':
        return company.employee_range ?? '';
      case 'description':
        return company.description ?? '';
      case 'industry':
        return company.industry?.name ?? '';
      case 'lifecycle_stage':
        return company.lifecycle_stage?.name ?? '';
      case 'tags':
        return (company.tags ?? []).map((t) => t.name).join(', ');
      case 'created_at':
        return this.formatDate(company.created_at);
      case 'updated_at':
        return this.formatDate(company.updated_at);
      default:
        if (col.key.startsWith('cf_')) {
          const field = col.key.slice(3);
          const val = (company.custom_fields as Record<string, unknown> | null)?.[field];
          return val === null || val === undefined ? '' : String(val);
        }
        return String(((company as unknown as Record<string, unknown>)[col.key] ?? '') as any);
    }
  }

  async exportCsv(business: Business, dto: ExportCompaniesDto): Promise<Buffer> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.industry', 'st')
      .leftJoinAndSelect('e.lifecycle_stage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.business_id = :bid', { bid: business.id });

    if (dto.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identification) LIKE :search)',
        { search: `%${dto.search.toLowerCase()}%` },
      );
    }
    if (dto.industry_id)
      qb.andWhere('e.industry_id = :stId', { stId: dto.industry_id });
    if (dto.lifecycle_stage_id)
      qb.andWhere('e.lifecycle_stage_id = :lsId', { lsId: dto.lifecycle_stage_id });
    if (dto.createdAtFrom)
      qb.andWhere('e.created_at >= :from', { from: dto.createdAtFrom });
    if (dto.createdAtTo)
      qb.andWhere('e.created_at <= :to', { to: dto.createdAtTo });

    qb.orderBy('e.name', 'ASC');
    const companies = await qb.getMany();

    const rows: string[][] = [
      dto.columns.map((c) => c.label),
      ...companies.map((company) =>
        dto.columns.map((col) => this.getColumnValue(company, col)),
      ),
    ];

    const csvString = stringify(rows, { bom: true });
    return Buffer.from(csvString, 'utf-8');
  }

  async import(
    business: Business,
    rows: ImportCompanyRowDto[],
  ): Promise<{ count: number }> {
    let inserted = 0;
    for (const row of rows) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: row.name },
      });
      if (existing) continue;
      await this.repo.save(
        this.repo.create({ ...row, business_id: business.id, tags: [] }),
      );
      inserted++;
    }
    return { count: inserted };
  }
}
