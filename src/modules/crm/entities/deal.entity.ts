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
  JoinTable,
  Index,
  ManyToMany,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Company } from './company.entity';
import { Contact } from './contact.entity';
import { User } from '@auth/entities/user.entity';
import { Team } from './team.entity';
import { CrmTask } from './task.entity';
import { Pipeline } from './pipeline.entity';
import { PipelineStage } from './pipeline-stage.entity';
import { DealStageHistory } from './deal-stage-history.entity';
import { DealStatus } from '@crm/enums/deal-status.enum';

@Entity({ name: 'deals', schema: 'crm' })
@Index(['businessId', 'status'])
@Index(['businessId', 'pipelineId'])
@Index(['businessId', 'stageId'])
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: DealStatus,
    default: DealStatus.OPEN,
  })
  status: DealStatus;

  @Column({ name: 'pipeline_id', type: 'uuid' })
  pipelineId: string;

  @ManyToOne(() => Pipeline, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @ManyToOne(() => PipelineStage, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'stage_id' })
  stage: PipelineStage;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @ManyToMany(() => Contact, (contact) => contact.deals)
  @JoinTable({
    name: 'deal_contacts',
    schema: 'crm',
    joinColumn: { name: 'deal_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' },
  })
  contacts: Contact[];

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team | null;

  @Column({ name: 'expected_close_date', type: 'timestamp', nullable: true })
  expectedCloseDate: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column('int', { default: 0 })
  probability: number;

  @OneToMany(() => CrmTask, (task) => task.deal)
  tasks: CrmTask[];

  @OneToMany(() => DealStageHistory, (h) => h.deal)
  stageHistory: DealStageHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
