import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export const typeOrmModuleConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.get<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: config.get<string>('NODE_ENV') !== 'production',
  }),
});
