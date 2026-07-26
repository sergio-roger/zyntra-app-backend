import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksProcessor } from './tasks.processor';
import { AgentTask } from './entities/agent-task.entity';
import { Business } from '../auth/entities/business.entity';
import { AGENT_TASKS_QUEUE } from '@/modules/tasks/constants/tasks.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentTask, Business]),
    BullModule.registerQueue({
      name: AGENT_TASKS_QUEUE,
    }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService],
})
export class TasksModule {}
