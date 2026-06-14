import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

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
