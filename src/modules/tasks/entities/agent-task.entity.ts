import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { AgentTaskStatus } from '@/modules/tasks/enums/agent-task-status.enum';
import { AgentTaskType } from '@/modules/tasks/enums/agent-task-type.enum';

@Entity({ name: 'agent_tasks', schema: 'workflows' })
@Index(['businessId', 'createdAt'])
@Index(['status'])
export class AgentTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'enum', enum: AgentTaskType })
  type: AgentTaskType;

  @Column({
    type: 'enum',
    enum: AgentTaskStatus,
    default: AgentTaskStatus.PENDING,
  })
  status: AgentTaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  input: unknown;

  @Column({ type: 'jsonb', nullable: true })
  output: unknown;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'tokens_used', type: 'int', nullable: true })
  tokensUsed: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
