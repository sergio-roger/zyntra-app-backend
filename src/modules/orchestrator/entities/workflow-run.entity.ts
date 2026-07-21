import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { WorkflowRunStatus } from '@/modules/orchestrator/enums/workflow-run-status.enum';

@Entity({ name: 'workflow_runs', schema: 'workflows' })
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'text' })
  goal: string;

  @Column({
    type: 'enum',
    enum: WorkflowRunStatus,
    default: WorkflowRunStatus.PENDING,
  })
  status: WorkflowRunStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: Record<string, unknown>[];

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
