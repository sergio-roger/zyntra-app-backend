import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly preferenceRepo: Repository<UserPreference>,
  ) {}

  async findOne(userId: string, key: string): Promise<UserPreference | null> {
    return this.preferenceRepo.findOne({
      where: { user_id: userId, key },
    });
  }

  async upsert(
    userId: string,
    key: string,
    value: unknown,
  ): Promise<UserPreference> {
    let preference = await this.preferenceRepo.findOne({
      where: { user_id: userId, key },
    });

    if (preference) {
      preference.value = value;
    } else {
      preference = this.preferenceRepo.create({
        user_id: userId,
        key,
        value,
      });
    }

    return this.preferenceRepo.save(preference);
  }
}
