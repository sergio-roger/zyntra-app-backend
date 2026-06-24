import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { PipelineStage } from './pipeline-stage.entity';

@Entity({ name: 'pipelines', schema: 'crm' })
@Index(['business_id'])
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column('int', { default: 0 })
  position: number;

  @Column({ default: false })
  is_default: boolean;

  @OneToMany(() => PipelineStage, (stage) => stage.pipeline, {
    cascade: ['insert'],
  })
  stages: PipelineStage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
