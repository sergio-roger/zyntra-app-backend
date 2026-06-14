import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmUser } from './entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateCrmUserDto, UpdateCrmUserDto } from './dto/crm-user.dto';

@Injectable()
export class CrmUsersService {
  constructor(
    @InjectRepository(CrmUser)
    private readonly userRepo: Repository<CrmUser>,
  ) {}

  async list(business: Business) {
    return this.userRepo.find({
      where: { business_id: business.id },
      relations: ['teams'],
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string) {
    const user = await this.userRepo.findOne({
      where: { id, business_id: business.id },
      relations: ['teams'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(business: Business, dto: CreateCrmUserDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email, business_id: business.id },
    });
    if (existing)
      throw new ConflictException('Email already registered for this business');

    const user = this.userRepo.create({
      ...dto,
      business_id: business.id,
    });
    return this.userRepo.save(user);
  }

  async update(business: Business, id: string, dto: UpdateCrmUserDto) {
    const user = await this.findOne(business, id);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(business: Business, id: string) {
    const user = await this.findOne(business, id);
    await this.userRepo.remove(user);
  }
}
