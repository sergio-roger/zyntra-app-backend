import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '@crm/entities/industry.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateIndustryDto } from '@crm/dto/create-industry.dto';
import { UpdateIndustryDto } from '@crm/dto/update-industry.dto';

@Injectable()
export class IndustriesService {
  constructor(
    @InjectRepository(Industry)
    private readonly repo: Repository<Industry>,
  ) {}

  async findAll(business: Business): Promise<Industry[]> {
    return this.repo.find({
      where: { business_id: business.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string): Promise<Industry> {
    const sector = await this.repo.findOne({
      where: { id, business_id: business.id },
    });
    if (!sector) throw new NotFoundException('Sector type not found');
    return sector;
  }

  async create(business: Business, dto: CreateIndustryDto): Promise<Industry> {
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
    dto: UpdateIndustryDto,
  ): Promise<Industry> {
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
