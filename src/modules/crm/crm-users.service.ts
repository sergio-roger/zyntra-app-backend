import { StorageClientService } from '@/storage-client/storage-client.service';
import { Business } from '@auth/entities/business.entity';
import { User } from '@auth/entities/user.entity';
import { CreateCrmUserDto, UpdateCrmUserDto } from '@crm/dto/crm-user.dto';
import { UserStatus } from '@crm/enums/user-status.enum';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CrmUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly storageClient: StorageClientService,
  ) {}

  async list(business: Business) {
    const users = await this.userRepo.find({
      where: { businessId: business.id },
      relations: ['teams'],
      order: { createdAt: 'ASC' },
    });

    return Promise.all(
      users.map(async (user) => {
        let avatarUrl = user.avatarUrl || null;
        if (user.avatarFileId) {
          try {
            avatarUrl = await this.storageClient.getSignedUrl(
              user.businessId,
              user.avatarFileId,
            );
          } catch {
            avatarUrl = null;
          }
        }
        return {
          ...user,
          avatarUrl,
        };
      }),
    );
  }

  async findOne(business: Business, id: string) {
    const user = await this.userRepo.findOne({
      where: { id, businessId: business.id },
      relations: ['teams'],
    });
    if (!user) throw new NotFoundException('User not found');

    let avatarUrl = user.avatarUrl || null;
    if (user.avatarFileId) {
      try {
        avatarUrl = await this.storageClient.getSignedUrl(
          user.businessId,
          user.avatarFileId,
        );
      } catch {
        avatarUrl = null;
      }
    }
    user.avatarUrl = avatarUrl;
    return user;
  }

  async create(business: Business, dto: CreateCrmUserDto) {
    const targetStatus =
      dto.status ??
      (dto.isActive === false ? UserStatus.INACTIVE : UserStatus.ACTIVE);

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

    const firstName = dto.firstName ?? (dto.name ? dto.name.split(' ')[0] : '');
    const lastName =
      dto.lastName ?? (dto.name ? dto.name.split(' ').slice(1).join(' ') : '');

    const user = this.userRepo.create({
      firstName,
      lastName,
      name: dto.name ?? `${firstName} ${lastName}`.trim(),
      email: dto.email,
      jobTitle: dto.jobTitle,
      avatarUrl: dto.avatarUrl,
      role: dto.role,
      status: targetStatus,
      isActive: targetStatus === UserStatus.ACTIVE,
      isAccountActivated: dto.isAccountActivated ?? false,
      businessId: business.id,
    });
    return this.userRepo.save(user);
  }

  async update(business: Business, id: string, dto: UpdateCrmUserDto) {
    const user = await this.findOne(business, id);

    let isActive = dto.isActive;
    if (dto.status !== undefined) {
      isActive = dto.status === UserStatus.ACTIVE;
    } else if (dto.isActive !== undefined) {
      dto.status = dto.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
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

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle;
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
      user.avatarFileId = null;
    }
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.status !== undefined) user.status = dto.status;
    if (isActive !== undefined) user.isActive = isActive;
    if (dto.isAccountActivated !== undefined)
      user.isAccountActivated = dto.isAccountActivated;

    return this.userRepo.save(user);
  }

  async remove(business: Business, id: string) {
    const user = await this.findOne(business, id);
    await this.userRepo.softRemove(user);
  }
}
