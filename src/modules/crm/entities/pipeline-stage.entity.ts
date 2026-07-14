import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';

@Entity({ name: 'pipeline_stages', schema: 'crm' })
@Index(['pipelineId', 'position'])
export class PipelineStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pipeline_id', type: 'uuid' })
  pipelineId: string;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @Column()
  name: string;

  @Column({ default: '#6366f1' })
  color: string;

  @Column('int', { default: 0 })
  position: number;

  @Column({
    type: 'enum',
    enum: PipelineStageType,
    default: PipelineStageType.ACTIVE,
  })
  type: PipelineStageType;

  @Column({ name: 'probability_percent', type: 'int', default: 20 })
  probabilityPercent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
