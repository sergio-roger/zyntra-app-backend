import { Business } from '@auth/entities/business.entity';
import { CreateCompanyDto } from '@crm/dto/create-company.dto';
import {
  ExportCompaniesDto,
  ExportCompanyColumnDto,
  ImportCompanyRowDto,
} from '@crm/dto/export-companies.dto';
import { ListCompaniesDto } from '@crm/dto/list-companies.dto';
import { UpdateCompanyDto } from '@crm/dto/update-company.dto';
import { Company } from '@crm/entities/company.entity';
import { Tag } from '@crm/entities/tag.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { stringify } from 'csv-stringify/sync';
import { In, Repository } from 'typeorm';

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
      .leftJoinAndSelect('e.lifecycleStage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.businessId = :bid', { bid: business.id });

    if (query.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identification) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.industryId) {
      qb.andWhere('e.industryId = :stId', { stId: query.industryId });
    }

    if (query.lifecycleStageId) {
      qb.andWhere('e.lifecycleStageId = :lsId', {
        lsId: query.lifecycleStageId,
      });
    }

    if (query.customFieldFilters) {
      this.applyCustomFieldFilters(qb, query.customFieldFilters);
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

  private applyCustomFieldFilters(
    qb: import('typeorm').SelectQueryBuilder<Company>,
    rawJson: string,
  ): void {
    try {
      const conditions = JSON.parse(rawJson) as Array<{
        field: string;
        operator: string;
        value: unknown;
      }>;
      conditions.forEach((cond, idx) => {
        const col = cond.field
          .replace('custom_fields.', '')
          .replace(/[^a-z0-9_]/gi, '');
        if (!col) return;
        const key = `cf_${idx}`;
        switch (cond.operator) {
          case 'equals':
            qb.andWhere(`e.custom_fields->>'${col}' = :${key}`, {
              [key]: String(cond.value),
            });
            break;
          case 'not_equals':
            qb.andWhere(`e.custom_fields->>'${col}' != :${key}`, {
              [key]: String(cond.value),
            });
            break;
          case 'contains':
            qb.andWhere(`e.custom_fields->>'${col}' ILIKE :${key}`, {
              [key]: `%${String(cond.value)}%`,
            });
            break;
          case 'greater_than':
            qb.andWhere(`(e.custom_fields->>'${col}')::numeric > :${key}`, {
              [key]: Number(cond.value),
            });
            break;
          case 'less_than':
            qb.andWhere(`(e.custom_fields->>'${col}')::numeric < :${key}`, {
              [key]: Number(cond.value),
            });
            break;
          case 'is_empty':
            qb.andWhere(
              `(e.custom_fields->>'${col}' IS NULL OR e.custom_fields->>'${col}' = '')`,
            );
            break;
          case 'is_not_empty':
            qb.andWhere(
              `(e.custom_fields->>'${col}' IS NOT NULL AND e.custom_fields->>'${col}' != '')`,
            );
            break;
        }
      });
    } catch {
      // ignore malformed JSON
    }
  }

  async findOne(business: Business, id: string): Promise<Company> {
    const company = await this.repo.findOne({
      where: { id, businessId: business.id },
      relations: ['industry', 'lifecycleStage', 'tags', 'owner'],
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(business: Business, dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.repo.findOne({
      where: { businessId: business.id, name: dto.name },
    });
    if (existing)
      throw new ConflictException('A company with this name already exists');

    const { tagIds, ...rest } = dto;
    const company = this.repo.create({ ...rest, businessId: business.id });

    if (tagIds?.length) {
      company.tags = await this.tagsRepo.findBy({
        id: In(tagIds),
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
        where: { businessId: business.id, name: dto.name },
      });
      if (existing)
        throw new ConflictException('A company with this name already exists');
    }

    const { tagIds, ...rest } = dto;
    Object.assign(company, rest);

    if (tagIds !== undefined) {
      if (tagIds.length === 0) {
        company.tags = [];
      } else {
        company.tags = await this.tagsRepo.findBy({
          id: In(tagIds),
          business_id: business.id,
        });
      }
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

  private getColumnValue(
    company: Company,
    col: ExportCompanyColumnDto,
  ): string {
    switch (col.key) {
      case 'identification':
        return company.identification ?? '';
      case 'website':
        return company.website ?? '';
      case 'employeeRange':
        return company.employeeRange ?? '';
      case 'description':
        return company.description ?? '';
      case 'industry':
        return company.industry?.name ?? '';
      case 'lifecycleStage':
        return company.lifecycleStage?.name ?? '';
      case 'tags':
        return (company.tags ?? []).map((t) => t.name).join(', ');
      case 'createdAt':
        return this.formatDate(company.createdAt);
      case 'updatedAt':
        return this.formatDate(company.updatedAt);
      default: {
        if (col.key.startsWith('cf_')) {
          const field = col.key.slice(3);
          const val = (
            company.customFields as Record<string, unknown> | null
          )?.[field];
          if (val === null || val === undefined) return '';
          return typeof val === 'object'
            ? JSON.stringify(val)
            : String(val as string | number | boolean);
        }
        const defaultVal = ((company as unknown as Record<string, unknown>)[
          col.key
        ] ?? '') as unknown;
        if (
          defaultVal === null ||
          defaultVal === undefined ||
          defaultVal === ''
        )
          return '';
        return typeof defaultVal === 'object'
          ? JSON.stringify(defaultVal)
          : String(defaultVal as string | number | boolean);
      }
    }
  }

  async exportCsv(
    business: Business,
    dto: ExportCompaniesDto,
  ): Promise<Buffer> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.industry', 'st')
      .leftJoinAndSelect('e.lifecycleStage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.businessId = :bid', { bid: business.id });

    if (dto.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identification) LIKE :search)',
        { search: `%${dto.search.toLowerCase()}%` },
      );
    }
    if (dto.industryId)
      qb.andWhere('e.industryId = :stId', { stId: dto.industryId });
    if (dto.lifecycleStageId)
      qb.andWhere('e.lifecycleStageId = :lsId', {
        lsId: dto.lifecycleStageId,
      });
    if (dto.createdAtFrom)
      qb.andWhere('e.createdAt >= :from', { from: dto.createdAtFrom });
    if (dto.createdAtTo)
      qb.andWhere('e.createdAt <= :to', { to: dto.createdAtTo });
    if (dto.customFieldFilters) {
      this.applyCustomFieldFilters(qb, dto.customFieldFilters);
    }

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
        where: { businessId: business.id, name: row.name },
      });
      if (existing) continue;
      await this.repo.save(
        this.repo.create({ ...row, businessId: business.id, tags: [] }),
      );
      inserted++;
    }
    return { count: inserted };
  }
}
