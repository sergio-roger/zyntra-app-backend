import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { KnowledgeDocument } from '@/modules/agents/entities/knowledge-document.entity';
import { Business } from '@auth/entities/business.entity';
import { AgentsModule } from '@/modules/agents/agents.module';
import { KnowledgeService } from '@/modules/knowledge/knowledge.service';
import { KnowledgeDocumentsController } from '@/modules/knowledge/knowledge-documents.controller';
import { KnowledgeUsageController } from '@/modules/knowledge/knowledge-usage.controller';
import { KnowledgeInternalController } from '@/modules/knowledge/knowledge-internal.controller';
import { KB_INGESTION_QUEUE } from '@/modules/knowledge/constants/knowledge.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, Business]),
    BullModule.registerQueue({ name: KB_INGESTION_QUEUE }),
    HttpModule,
    AgentsModule,
  ],
  controllers: [
    KnowledgeDocumentsController,
    KnowledgeUsageController,
    KnowledgeInternalController,
  ],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
