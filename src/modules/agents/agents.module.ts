import { AgentsController } from '@/modules/agents/agents.controller';
import { InternalAgentConfigController } from '@/modules/agents/internal-agent-config.controller';
import { InternalSystemAgentConfigController } from '@/modules/agents/internal-system-agent-config.controller';
import { SystemAgentsController } from '@/modules/agents/system-agents.controller';
import { BusinessSystemAgentsController } from '@/modules/agents/business-system-agents.controller';
import { AgentsService } from '@/modules/agents/agents.service';
import { SystemAgentsService } from '@/modules/agents/system-agents.service';
import { BusinessSystemAgentsService } from '@/modules/agents/business-system-agents.service';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { SystemAgent } from '@/modules/agents/entities/system-agent.entity';
import { AgentCategory } from '@/modules/agents/entities/agent-category.entity';
import { BusinessSystemAgent } from '@/modules/agents/entities/business-system-agent.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { StorageClientModule } from '@/storage-client/storage-client.module';
import { AiModule } from '@ai/ai.module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      SystemAgent,
      AgentCategory,
      BusinessSystemAgent,
    ]),
    AiModule,
    ChannelsModule,
    StorageClientModule,
    HttpModule,
    // Mismo nombre de cola que KnowledgeModule ('kb-deletion') — se borra
    // toda la colección kb_<agentId> cuando se borra el agente completo.
    BullModule.registerQueue({ name: 'kb-deletion' }),
  ],
  controllers: [
    AgentsController,
    InternalAgentConfigController,
    InternalSystemAgentConfigController,
    SystemAgentsController,
    BusinessSystemAgentsController,
  ],
  providers: [AgentsService, SystemAgentsService, BusinessSystemAgentsService],
  exports: [AgentsService, TypeOrmModule],
})
export class AgentsModule {}
