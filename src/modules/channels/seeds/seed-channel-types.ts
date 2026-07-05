import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';

dotenv.config();

const WEB_CHAT_SCHEMA = {
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
};

const FACEBOOK_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    page_id: { type: 'string' },
  },
  required: ['page_id'],
  additionalProperties: false,
};

const TELEGRAM_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    bot_username: { type: 'string' },
  },
  required: ['bot_username'],
  additionalProperties: false,
};

export const CHANNEL_TYPES_SEED = [
  {
    key: 'web_chat',
    label: 'Web Chat',
    description: 'Widget embebible para sitios web',
    icon_url: null,
    is_available: true,
    config_schema: WEB_CHAT_SCHEMA,
    sort_order: 1,
  },
  {
    key: 'facebook',
    label: 'Facebook Messenger',
    description: 'Integración con páginas de Facebook',
    icon_url: null,
    is_available: false,
    config_schema: FACEBOOK_SCHEMA,
    sort_order: 2,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Bot de Telegram',
    icon_url: null,
    is_available: false,
    config_schema: TELEGRAM_SCHEMA,
    sort_order: 3,
  },
];

async function run() {
  const config = new ConfigService();

  const ds = new DataSource({
    type: 'postgres',
    url: config.get<string>('DATABASE_URL'),
    entities: [ChannelType],
    synchronize: false,
  });

  await ds.initialize();

  const repo = ds.getRepository(ChannelType);

  for (const seed of CHANNEL_TYPES_SEED) {
    const existing = await repo.findOne({ where: { key: seed.key } });
    if (!existing) {
      await repo.save(repo.create(seed));
      console.log(`✅ Inserted channel_type: ${seed.key}`);
    } else {
      console.log(`⏭  Skipped (exists): ${seed.key}`);
    }
  }

  await ds.destroy();
  console.log('Seed done.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
