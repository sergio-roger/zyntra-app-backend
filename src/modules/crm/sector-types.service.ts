import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorType } from '@crm/entities/sector-type.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateSectorTypeDto } from './dto/create-sector-type.dto';
import { UpdateSectorTypeDto } from './dto/update-sector-type.dto';

@Injectable()
export class SectorTypesService {
  constructor(
    @InjectRepository(SectorType)
    private readonly repo: Repository<SectorType>,
  ) {}

  async findAll(business: Business): Promise<SectorType[]> {
    return this.repo.find({
      where: { business_id: business.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<SectorType> {
    const sector = await this.repo.findOne({
      where: { id, business_id: business.id },
    });
    if (!sector) throw new NotFoundException('Sector type not found');
    return sector;
  }

  async create(
    business: Business,
    dto: CreateSectorTypeDto,
  ): Promise<SectorType> {
    const existing = await this.repo.findOne({
      where: { business_id: business.id, name: dto.name },
    });
    if (existing)
      throw new ConflictException(
        'A sector type with this name already exists',
      );

    const sector = this.repo.create({ ...dto, business_id: business.id });
    return this.repo.save(sector);
  }

  async update(
    business: Business,
    id: string,
    dto: UpdateSectorTypeDto,
  ): Promise<SectorType> {
    const sector = await this.findOne(business, id);

    if (dto.name && dto.name !== sector.name) {
      const existing = await this.repo.findOne({
        where: { business_id: business.id, name: dto.name },
      });
      if (existing)
        throw new ConflictException(
          'A sector type with this name already exists',
        );
    }

    Object.assign(sector, dto);
    return this.repo.save(sector);
  }

  async remove(business: Business, id: string): Promise<void> {
    const sector = await this.findOne(business, id);
    await this.repo.softRemove(sector);
  }
}
