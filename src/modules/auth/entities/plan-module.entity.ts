import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Plan } from './plan.entity';

export enum ModuleAccessLevel {
  FULL = 'full',
  READ_ONLY = 'read_only',
  LOCKED = 'locked',
}

@Entity({ name: 'plan_modules', schema: 'public' })
@Index(['plan_id', 'menu_key'], { unique: true })
export class PlanModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  plan_id: string;

  @Column({ type: 'varchar', length: 100 })
  menu_key: string;

  @Column({
    type: 'enum',
    enum: ModuleAccessLevel,
    default: ModuleAccessLevel.LOCKED,
  })
  access_level: ModuleAccessLevel;

  @ManyToOne(() => Plan, (plan) => plan.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
