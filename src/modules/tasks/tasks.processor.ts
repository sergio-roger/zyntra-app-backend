import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTask } from './entities/agent-task.entity';
import { AgentTaskStatus } from './enums/agent-task-status.enum';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@QueueEventsListener('agent-tasks')
export class TasksProcessor extends QueueEventsHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
  ) {
    super();
  }

  @OnQueueEvent('active')
  async onActive({ jobId }: { jobId: string }) {
    this.logger.log(`Job ${jobId} detectado como ACTIVO`);
    await this.taskRepo.update(jobId, {
      status: AgentTaskStatus.RUNNING,
      startedAt: new Date(),
    });
  }

  @OnQueueEvent('completed')
  async onCompleted({
    jobId,
    returnvalue,
  }: {
    jobId: string;
    returnvalue: string;
  }) {
    this.logger.log(`Job ${jobId} detectado como COMPLETADO`);

    let parsed: unknown = returnvalue;
    try {
      if (
        typeof returnvalue === 'string' &&
        (returnvalue.startsWith('{') || returnvalue.startsWith('['))
      ) {
        parsed = JSON.parse(returnvalue) as unknown;
      }
    } catch {
      this.logger.warn(
        `returnvalue de job ${jobId} no es JSON, se guardará como texto plano`,
      );
    }

    const output =
      parsed && typeof parsed === 'object' && 'output' in parsed
        ? (parsed as Record<string, unknown>).output
        : parsed;

    try {
      await this.taskRepo.update(jobId, {
        status: AgentTaskStatus.COMPLETED,
        completedAt: new Date(),
        output:
          typeof output === 'object' ? JSON.stringify(output, null, 2) : output,
      });
      this.logger.log(`Tarea ${jobId} → COMPLETED`);
    } catch (e) {
      this.logger.error(
        `Error actualizando tarea ${jobId}: ${(e as Error).message}`,
      );
    }
  }

  @OnQueueEvent('failed')
  async onFailed({
    jobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) {
    this.logger.error(`Job ${jobId} detectado como FALLIDO: ${failedReason}`);
    await this.taskRepo.update(jobId, {
      status: AgentTaskStatus.FAILED,
      error: failedReason,
    });
  }
}
