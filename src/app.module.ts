import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AgentsModule } from '@/modules/agents/agents.module';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { LifecycleModule } from '@/modules/lifecycle/lifecycle.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { AiModule } from '@ai/ai.module';
import { AuthModule } from '@auth/auth.module';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ChatbotModule } from '@chatbot/chatbot.module';
import { PlanModuleGuard } from '@common/guards/plan-module.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CrmModule } from '@crm/crm.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),

    AuthModule,

    CrmModule,
    LifecycleModule,
    ChatbotModule,

    AiModule,

    TasksModule,
    ChannelsModule,
    AgentsModule,

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PlanModuleGuard },
  ],
})
export class AppModule {}
