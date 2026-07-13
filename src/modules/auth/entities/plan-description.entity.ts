import { Plan } from '@auth/entities/plan.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'plan_descriptions', schema: 'public' })
export class PlanDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Plan, (plan) => plan.descriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column()
  text: string;

  @Column({ name: 'is_included', default: true })
  isIncluded: boolean;

  @Column({ default: 0 })
  order: number;
}
