import { AgentsController } from '@/modules/agents/agents.controller';
import { InternalAgentConfigController } from '@/modules/agents/internal-agent-config.controller';
import { SystemAgentsController } from '@/modules/agents/system-agents.controller';
import { AgentsService } from '@/modules/agents/agents.service';
import { SystemAgentsService } from '@/modules/agents/system-agents.service';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { AiModule } from '@ai/ai.module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, SystemAgent]),
    AiModule,
    ChannelsModule,
    HttpModule,
    // Mismo nombre de cola que KnowledgeModule ('kb-deletion') — se borra
    // toda la colección kb_<agentId> cuando se borra el agente completo.
    BullModule.registerQueue({ name: 'kb-deletion' }),
  ],
  controllers: [AgentsController, InternalAgentConfigController, SystemAgentsController],
  providers: [AgentsService, SystemAgentsService],
  exports: [AgentsService, TypeOrmModule],
})
export class AgentsModule {}
