import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from '@auth/entities/user.entity';
import { Business } from '@auth/entities/business.entity';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async list(business: Business) {
    return this.teamRepo.find({
      where: { businessId: business.id },
      relations: ['members'],
      order: { name: 'ASC' },
    });
  }

  async findOne(business: Business, id: string) {
    const team = await this.teamRepo.findOne({
      where: { id, businessId: business.id },
      relations: ['members'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(business: Business, dto: CreateTeamDto) {
    const { member_ids, ...rest } = dto;
    const team = this.teamRepo.create({
      ...rest,
      businessId: business.id,
      members: [],
    });

    if (member_ids && member_ids.length > 0) {
      team.members = await this.userRepo.find({
        where: { id: In(member_ids), businessId: business.id },
      });
    }

    return this.teamRepo.save(team);
  }

  async update(business: Business, id: string, dto: UpdateTeamDto) {
    const team = await this.findOne(business, id);
    const { member_ids, ...rest } = dto;

    Object.assign(team, rest);

    if (member_ids !== undefined) {
      if (member_ids.length > 0) {
        team.members = await this.userRepo.find({
          where: { id: In(member_ids), businessId: business.id },
        });
      } else {
        team.members = [];
      }
    }

    return this.teamRepo.save(team);
  }

  async remove(business: Business, id: string) {
    const team = await this.findOne(business, id);
    await this.teamRepo.softRemove(team);
  }
}
