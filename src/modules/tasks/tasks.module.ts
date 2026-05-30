import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksProcessor } from './tasks.processor';
import { AgentTask, AgentTaskSchema } from './schemas/agent-task.schema';
import { Business } from '../auth/entities/business.entity';
import { ChatbotConfig } from '../chatbot/entities/chatbot-config.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentTask.name, schema: AgentTaskSchema },
    ]),
    TypeOrmModule.forFeature([Business, ChatbotConfig]),
    BullModule.registerQueue({
      name: 'agent-tasks',
    }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService],
})
export class TasksModule {}
