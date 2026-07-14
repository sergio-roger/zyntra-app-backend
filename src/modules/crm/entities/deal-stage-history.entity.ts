import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Deal } from './deal.entity';
import { PipelineStage } from './pipeline-stage.entity';

@Entity({ name: 'deal_stage_history', schema: 'crm' })
@Index(['dealId', 'enteredAt'])
export class DealStageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deal_id', type: 'uuid' })
  dealId: string;

  @ManyToOne(() => Deal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'stage_id', type: 'uuid', nullable: true })
  stageId: string | null;

  @ManyToOne(() => PipelineStage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage: PipelineStage | null;

  @Column({ name: 'entered_at', type: 'timestamp' })
  enteredAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date | null;
}
