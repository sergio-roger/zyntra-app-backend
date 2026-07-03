import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from '@auth/entities/plan.entity';

export enum PlanStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'businesses', schema: 'public' })
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'job_title', nullable: true })
  jobTitle: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_account_activated', default: true })
  isAccountActivated: boolean;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  plan_id: string;

  @ManyToOne(() => Plan, (plan) => plan.businesses)
  @JoinColumn({ name: 'plan_id' })
  plan_object: Plan;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.TRIAL,
  })
  plan_status: PlanStatus;

  @Column({ type: 'timestamp' })
  trial_ends_at: Date;

  @Column({ nullable: true })
  stripe_customer_id: string;

  @Column({ nullable: true })
  stripe_subscription_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
