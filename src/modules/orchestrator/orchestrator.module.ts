import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowRun } from '@/modules/orchestrator/entities/workflow-run.entity';
import { Business } from '@auth/entities/business.entity';
import { OrchestratorService } from '@/modules/orchestrator/orchestrator.service';
import { OrchestratorInternalController } from '@/modules/orchestrator/orchestrator-internal.controller';
import { ORCHESTRATOR_RUN_QUEUE } from '@/modules/orchestrator/constants/orchestrator.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowRun, Business]),
    BullModule.registerQueue({ name: ORCHESTRATOR_RUN_QUEUE }),
  ],
  controllers: [OrchestratorInternalController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
