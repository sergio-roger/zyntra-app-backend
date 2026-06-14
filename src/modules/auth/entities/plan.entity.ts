import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanDescription } from './plan-description.entity';
import { Business } from './business.entity';

export enum BillingCycle {
  ONE_TIME = 'one-time',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billing_cycle: BillingCycle;

  @Column({ default: false })
  is_popular: boolean;

  @Column({ default: 0 })
  contact_limit: number;

  @Column({ default: 0 })
  task_limit: number;

  @Column({ nullable: true })
  stripe_price_id: string;

  @OneToMany(() => PlanDescription, (desc) => desc.plan, { cascade: true })
  descriptions: PlanDescription[];

  @OneToMany(() => Business, (business) => business.plan_object)
  businesses: Business[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
