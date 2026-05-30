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
import { Business } from '@auth/entities/business.entity';
import { Contact } from './contact.entity';
import { CrmUser } from './user.entity';
import { Team } from './team.entity';
import { CrmTask } from './task.entity';
import { DealStatus } from '@crm/enums/deal-status.enum';
import { DealStage } from '@crm/enums/deal-stage.enum';

@Entity({ name: 'deals', schema: 'crm' })
@Index(['business_id', 'status'])
@Index(['business_id', 'stage'])
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({
    type: 'enum',
    enum: DealStage,
    default: DealStage.PROSPECTING,
  })
  stage: DealStage;

  @Column({
    type: 'enum',
    enum: DealStatus,
    default: DealStatus.OPEN,
  })
  status: DealStatus;

  @Column('uuid')
  contact_id: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column('uuid', { nullable: true })
  assigned_to_id: string | null;

  @ManyToOne(() => CrmUser, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assigned_to: CrmUser | null;

  @Column('uuid', { nullable: true })
  team_id: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team | null;

  @Column('timestamp', { nullable: true })
  expected_close_date: Date | null;

  @Column('int', { default: 0 })
  probability: number; // 0 to 100

  @OneToMany(() => CrmTask, (task) => task.deal)
  tasks: CrmTask[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
