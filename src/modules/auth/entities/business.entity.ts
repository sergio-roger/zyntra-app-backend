import { Plan } from '@auth/entities/plan.entity';
import { PlanStatus } from '@auth/enums/plan-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'businesses', schema: 'security' })
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column({ nullable: true })
  website: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'plan_id', nullable: true })
  planId: string;

  @ManyToOne(() => Plan, (plan) => plan.businesses)
  @JoinColumn({ name: 'plan_id' })
  plan_object: Plan;

  @Column({
    name: 'plan_status',
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.TRIAL,
  })
  planStatus: PlanStatus;

  @Column({ name: 'trial_ends_at', type: 'timestamp' })
  trialEndsAt: Date;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
