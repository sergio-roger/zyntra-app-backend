import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

@Entity('plan_descriptions')
export class PlanDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  plan_id: string;

  @ManyToOne(() => Plan, (plan) => plan.descriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column()
  text: string;

  @Column({ default: true })
  is_included: boolean;

  @Column({ default: 0 })
  order: number;
}
