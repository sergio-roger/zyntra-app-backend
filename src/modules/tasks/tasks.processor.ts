import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AgentTask,
  AgentTaskDocument,
  AgentTaskStatus,
} from './schemas/agent-task.schema';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@QueueEventsListener('agent-tasks')
export class TasksProcessor extends QueueEventsHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(
    @InjectModel(AgentTask.name)
    private taskModel: Model<AgentTaskDocument>,
  ) {
    super();
  }

  @OnQueueEvent('active')
  async onActive({ jobId }: { jobId: string }) {
    this.logger.log(`Job ${jobId} detectado como ACTIVO`);
    await this.taskModel.findByIdAndUpdate(jobId, {
      status: AgentTaskStatus.RUNNING,
      started_at: new Date(),
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
      await this.taskModel.findByIdAndUpdate(jobId, {
        status: AgentTaskStatus.COMPLETED,
        completed_at: new Date(),
        output:
          typeof output === 'object' ? JSON.stringify(output, null, 2) : output,
      });
      this.logger.log(`MongoDB actualizado: tarea ${jobId} → COMPLETED`);
    } catch (e) {
      this.logger.error(
        `Error actualizando MongoDB para tarea ${jobId}: ${(e as Error).message}`,
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
    await this.taskModel.findByIdAndUpdate(jobId, {
      status: AgentTaskStatus.FAILED,
      error: failedReason,
    });
  }
}
