import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { bullModuleConfig } from '@/config/bull.config';
import { httpModuleConfig } from '@/config/http.config';
import { typeOrmModuleConfig } from '@/config/typeorm.config';
import { AgentsModule } from '@/modules/agents/agents.module';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { FormsModule } from '@/modules/forms/forms.module';
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module';
import { LifecycleModule } from '@/modules/lifecycle/lifecycle.module';
import { OrchestratorModule } from '@/modules/orchestrator/orchestrator.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { GLOBAL_PROVIDERS } from '@/providers/global.providers';
import { AiModule } from '@ai/ai.module';
import { AuthModule } from '@auth/auth.module';
import { ChatbotModule } from '@chatbot/chatbot.module';
import { LoggerModule } from '@common/logging/logger.module';
import { RedisModule } from '@common/redis/redis.module';
import { CrmModule } from '@crm/crm.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    LoggerModule,
    RedisModule,
    httpModuleConfig,
    AuthModule,
    CrmModule,
    LifecycleModule,
    ChatbotModule,
    AiModule,
    TasksModule,
    ChannelsModule,
    AgentsModule,
    KnowledgeModule,
    OrchestratorModule,
    FormsModule,
    DriveModule,
    bullModuleConfig,
    typeOrmModuleConfig,
  ],
  controllers: [AppController],
  providers: [AppService, ...GLOBAL_PROVIDERS],
})
export class AppModule {}
