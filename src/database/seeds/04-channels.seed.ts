import { DataSource } from 'typeorm';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import { Seeder } from './seeder.interface';

const CHANNEL_TYPES_SEED = [
  {
    key: 'web_chat',
    label: 'Web Chat',
    description: 'Widget embebible para sitios web',
    icon_url: null,
    is_available: true,
    config_schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        position: {
          type: 'string',
          enum: ['bottom-left', 'bottom-right'],
          default: 'bottom-right',
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'auto'],
          default: 'auto',
        },
        primaryColor: {
          type: 'string',
          pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
          default: '#6366f1',
        },
        greeting: { type: 'string', maxLength: 500 },
        name: { type: 'string', maxLength: 100 },
        allowedDomains: {
          type: 'array',
          items: { type: 'string', format: 'hostname' },
        },
      },
      additionalProperties: false,
    },
    sort_order: 1,
  },
  {
    key: 'facebook',
    label: 'Facebook Messenger',
    description: 'Integración con páginas de Facebook',
    icon_url: null,
    is_available: false,
    config_schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        page_id: { type: 'string' },
      },
      required: ['page_id'],
      additionalProperties: false,
    },
    sort_order: 2,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Bot de Telegram',
    icon_url: null,
    is_available: false,
    config_schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        bot_username: { type: 'string' },
      },
      required: ['bot_username'],
      additionalProperties: false,
    },
    sort_order: 3,
  },
];

export class ChannelsSeeder implements Seeder {
  async run(ds: DataSource): Promise<void> {
    const channelTypeRepo = ds.getRepository(ChannelType);

    console.log('\n📡 Seeding channel types...');

    for (const seed of CHANNEL_TYPES_SEED) {
      const existing = await channelTypeRepo.findOne({
        where: { key: seed.key },
      });
      if (!existing) {
        await channelTypeRepo.save(channelTypeRepo.create(seed));
        console.log(`  ✅ Channel type created: ${seed.key}`);
      } else {
        console.log(`  ℹ️  Channel type already exists: ${seed.key}`);
      }
    }
  }
}
