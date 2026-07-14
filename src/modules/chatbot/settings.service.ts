import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

const INBOX_SOUND_KEY = 'inbox_sound_enabled';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {}

  async getInboxSoundEnabled(businessId: string): Promise<boolean> {
    const setting = await this.settingRepo.findOne({
      where: { businessId, key: INBOX_SOUND_KEY },
    });
    if (!setting) return true;
    return (setting.value as { enabled?: boolean }).enabled ?? true;
  }

  async setInboxSoundEnabled(
    businessId: string,
    enabled: boolean,
  ): Promise<boolean> {
    let setting = await this.settingRepo.findOne({
      where: { businessId, key: INBOX_SOUND_KEY },
    });

    if (setting) {
      setting.value = { enabled };
    } else {
      setting = this.settingRepo.create({
        businessId,
        key: INBOX_SOUND_KEY,
        value: { enabled },
      });
    }

    await this.settingRepo.save(setting);
    return enabled;
  }
}
