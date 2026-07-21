import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { WorkflowRun } from '@/modules/orchestrator/entities/workflow-run.entity';
import { WorkflowRunStatus } from '@/modules/orchestrator/enums/workflow-run-status.enum';
import { WorkflowRunCallbackDto } from '@/modules/orchestrator/dto/workflow-run-callback.dto';
import { ORCHESTRATOR_RUN_QUEUE } from '@/modules/orchestrator/constants/orchestrator.constants';

@Injectable()
export class OrchestratorService {
  constructor(
    @InjectRepository(WorkflowRun)
    private readonly workflowRunRepo: Repository<WorkflowRun>,
    @InjectQueue(ORCHESTRATOR_RUN_QUEUE)
    private readonly orchestratorQueue: Queue,
  ) {}

  async enqueueRun(
    businessId: string,
    goal: string,
    tasks: Record<string, unknown>[] = [],
  ): Promise<WorkflowRun> {
    const run = this.workflowRunRepo.create({
      businessId,
      goal,
      status: WorkflowRunStatus.PENDING,
      steps: [],
    });
    await this.workflowRunRepo.save(run);

    await this.orchestratorQueue.add(
      'run-workflow',
      { workflowRunId: run.id, businessId, goal, tasks },
      { jobId: run.id, removeOnComplete: false, removeOnFail: false },
    );

    return run;
  }

  async findOne(id: string): Promise<WorkflowRun> {
    const run = await this.workflowRunRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Workflow run no encontrado');
    return run;
  }

  async handleCallback(
    dto: WorkflowRunCallbackDto,
  ): Promise<{ ok: boolean }> {
    const run = await this.findOne(dto.workflowRunId);

    run.status = dto.status;
    if (dto.steps !== undefined) run.steps = dto.steps;
    if (dto.errorMessage !== undefined) run.errorMessage = dto.errorMessage;

    if (
      dto.status === WorkflowRunStatus.RUNNING &&
      run.startedAt === null
    ) {
      run.startedAt = new Date();
    }
    if (
      dto.status === WorkflowRunStatus.COMPLETED ||
      dto.status === WorkflowRunStatus.FAILED
    ) {
      run.finishedAt = new Date();
    }

    await this.workflowRunRepo.save(run);
    return { ok: true };
  }
}
