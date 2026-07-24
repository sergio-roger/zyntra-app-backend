import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullModuleConfig = BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
    },
  }),
});
