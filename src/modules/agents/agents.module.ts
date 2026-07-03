import { AgentsController } from '@/modules/agents/agents.controller';
import { AgentsService } from '@/modules/agents/agents.service';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { AiModule } from '@ai/ai.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), AiModule, ChannelsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService, TypeOrmModule],
})
export class AgentsModule {}
