import { AgentsController } from '@/modules/agents/agents.controller';
import { InternalAgentConfigController } from '@/modules/agents/internal-agent-config.controller';
import { AgentsService } from '@/modules/agents/agents.service';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { AiModule } from '@ai/ai.module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    AiModule,
    ChannelsModule,
    // Mismo nombre de cola que KnowledgeModule ('kb-deletion') — se borra
    // toda la colección kb_<agentId> cuando se borra el agente completo.
    BullModule.registerQueue({ name: 'kb-deletion' }),
  ],
  controllers: [AgentsController, InternalAgentConfigController],
  providers: [AgentsService],
  exports: [AgentsService, TypeOrmModule],
})
export class AgentsModule {}
