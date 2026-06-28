import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmUser } from './entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateCrmUserDto, UpdateCrmUserDto } from './dto/crm-user.dto';
import { UserStatus } from '@crm/enums/user-status.enum';

@Injectable()
export class CrmUsersService {
  constructor(
    @InjectRepository(CrmUser)
    private readonly userRepo: Repository<CrmUser>,
  ) {}

  async list(business: Business) {
    return this.userRepo.find({
      where: { businessId: business.id },
      relations: ['teams'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(business: Business, id: string) {
    const user = await this.userRepo.findOne({
      where: { id, businessId: business.id },
      relations: ['teams'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(business: Business, dto: CreateCrmUserDto) {
    const targetStatus = dto.status ?? (dto.is_active === false ? UserStatus.INACTIVE : UserStatus.ACTIVE);

    if (targetStatus === UserStatus.ACTIVE) {
      const limit = business.plan_object?.user_limit;
      if (limit !== undefined && limit !== null && limit !== 999999) {
        const currentCount = await this.userRepo.count({
          where: { businessId: business.id, isActive: true },
        });
        if (currentCount >= limit) {
          throw new HttpException(
            {
              code: 'plan_limit_reached',
              resource: 'crm_users',
              limit,
              current: currentCount,
              message: `Tu plan "${business.plan_object?.name}" permite hasta ${limit} usuarios. Ya alcanzaste el límite.`,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      }
    }

    const existing = await this.userRepo.findOne({
      where: { email: dto.email, businessId: business.id },
    });
    if (existing)
      throw new ConflictException('Email already registered for this business');

    const firstName = dto.first_name ?? (dto.name ? dto.name.split(' ')[0] : '');
    const lastName = dto.last_name ?? (dto.name ? dto.name.split(' ').slice(1).join(' ') : '');

    const user = this.userRepo.create({
      firstName,
      lastName,
      name: dto.name ?? `${firstName} ${lastName}`.trim(),
      email: dto.email,
      jobTitle: dto.job_title,
      avatarUrl: dto.avatar_url,
      role: dto.role,
      status: targetStatus,
      isActive: targetStatus === UserStatus.ACTIVE,
      isAccountActivated: dto.is_account_activated ?? false,
      businessId: business.id,
    });
    return this.userRepo.save(user);
  }

  async update(business: Business, id: string, dto: UpdateCrmUserDto) {
    const user = await this.findOne(business, id);

    let isActive = dto.is_active;
    if (dto.status !== undefined) {
      isActive = dto.status === UserStatus.ACTIVE;
    } else if (dto.is_active !== undefined) {
      dto.status = dto.is_active ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    }

    if (isActive === true && user.isActive === false) {
      const limit = business.plan_object?.user_limit;
      if (limit !== undefined && limit !== null && limit !== 999999) {
        const currentCount = await this.userRepo.count({
          where: { businessId: business.id, isActive: true },
        });
        if (currentCount >= limit) {
          throw new HttpException(
            {
              code: 'plan_limit_reached',
              resource: 'crm_users',
              limit,
              current: currentCount,
              message: `Tu plan "${business.plan_object?.name}" permite hasta ${limit} usuarios. Ya alcanzaste el límite.`,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      }
    }

    if (dto.first_name !== undefined) user.firstName = dto.first_name;
    if (dto.last_name !== undefined) user.lastName = dto.last_name;
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.job_title !== undefined) user.jobTitle = dto.job_title;
    if (dto.avatar_url !== undefined) user.avatarUrl = dto.avatar_url;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.status !== undefined) user.status = dto.status;
    if (isActive !== undefined) user.isActive = isActive;
    if (dto.is_account_activated !== undefined) user.isAccountActivated = dto.is_account_activated;

    return this.userRepo.save(user);
  }

  async remove(business: Business, id: string) {
    const user = await this.findOne(business, id);
    await this.userRepo.softRemove(user);
  }
}
