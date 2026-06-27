import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Empresa } from './entities/empresa.entity';
import { Tag } from './entities/tag.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ListEmpresasDto } from './dto/list-empresas.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly repo: Repository<Empresa>,
    @InjectRepository(Tag)
    private readonly tagsRepo: Repository<Tag>,
  ) {}

  async list(business: Business, query: ListEmpresasDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.sector_tipo', 'st')
      .leftJoinAndSelect('e.lifecycle_stage', 'ls')
      .leftJoinAndSelect('e.tags', 't')
      .where('e.business_id = :bid', { bid: business.id });

    if (query.search) {
      qb.andWhere(
        '(LOWER(e.name) LIKE :search OR LOWER(e.identificacion) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.sector_tipo_id) {
      qb.andWhere('e.sector_tipo_id = :stId', { stId: query.sector_tipo_id });
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

  async findOne(business: Business, id: string): Promise<Empresa> {
    const empresa = await this.repo.findOne({
      where: { id, business_id: business.id },
      relations: ['sector_tipo', 'lifecycle_stage', 'tags'],
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async create(business: Business, dto: CreateEmpresaDto): Promise<Empresa> {
    const existing = await this.repo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing) throw new ConflictException('Ya existe una empresa con ese nombre');

    const { tag_ids, ...rest } = dto;
    const empresa = this.repo.create({ ...rest, business_id: business.id });

    if (tag_ids?.length) {
      empresa.tags = await this.tagsRepo.findBy({
        id: In(tag_ids),
        business_id: business.id,
      });
    } else {
      empresa.tags = [];
    }

    return this.repo.save(empresa);
  }

  async update(business: Business, id: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const empresa = await this.findOne(business, id);

    if (dto.name && dto.name !== empresa.name) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing) throw new ConflictException('Ya existe una empresa con ese nombre');
    }

    const { tag_ids, ...rest } = dto;
    Object.assign(empresa, rest);

    if (tag_ids !== undefined) {
      empresa.tags = tag_ids.length
        ? await this.tagsRepo.findBy({ id: In(tag_ids), business_id: business.id })
        : [];
    }

    return this.repo.save(empresa);
  }

  async remove(business: Business, id: string): Promise<void> {
    const empresa = await this.findOne(business, id);
    await this.repo.softRemove(empresa);
  }
}
