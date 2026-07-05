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
@Index(['deal_id', 'entered_at'])
export class DealStageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deal_id: string;

  @ManyToOne(() => Deal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column('uuid', { nullable: true })
  stage_id: string | null;

  @ManyToOne(() => PipelineStage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage: PipelineStage | null;

  @Column('timestamp')
  entered_at: Date;

  @Column('timestamp', { nullable: true })
  left_at: Date | null;
}
