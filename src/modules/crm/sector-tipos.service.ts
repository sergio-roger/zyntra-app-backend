import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorTipo } from './entities/sector-tipo.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateSectorTipoDto } from './dto/create-sector-tipo.dto';
import { UpdateSectorTipoDto } from './dto/update-sector-tipo.dto';

@Injectable()
export class SectorTiposService {
  constructor(
    @InjectRepository(SectorTipo)
    private readonly repo: Repository<SectorTipo>,
  ) {}

  async findAll(business: Business): Promise<SectorTipo[]> {
    return this.repo.find({
      where: { business_id: business.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<SectorTipo> {
    const sector = await this.repo.findOne({
      where: { id, business_id: business.id },
    });
    if (!sector) throw new NotFoundException('Sector no encontrado');
    return sector;
  }

  async create(business: Business, dto: CreateSectorTipoDto): Promise<SectorTipo> {
    const existing = await this.repo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing) throw new ConflictException('Ya existe un sector con ese nombre');

    const sector = this.repo.create({ ...dto, business_id: business.id });
    return this.repo.save(sector);
  }

  async update(business: Business, id: string, dto: UpdateSectorTipoDto): Promise<SectorTipo> {
    const sector = await this.findOne(business, id);

    if (dto.name && dto.name !== sector.name) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing) throw new ConflictException('Ya existe un sector con ese nombre');
    }

    Object.assign(sector, dto);
    return this.repo.save(sector);
  }

  async remove(business: Business, id: string): Promise<void> {
    const sector = await this.findOne(business, id);
    await this.repo.softRemove(sector);
  }
}
