import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';

@Entity({ name: 'pipeline_stages', schema: 'crm' })
@Index(['pipeline_id', 'position'])
export class PipelineStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pipeline_id: string;

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

  @Column('int', { default: 20 })
  probability_percent: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
