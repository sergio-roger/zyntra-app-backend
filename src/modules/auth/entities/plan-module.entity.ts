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
import { Plan } from '@auth/entities/plan.entity';
import { ModuleAccessLevel } from '@auth/enums/module-access-level.enum';

@Entity({ name: 'plan_modules', schema: 'security' })
@Index(['planId', 'menuKey'], { unique: true })
export class PlanModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'menu_key', type: 'varchar', length: 100 })
  menuKey: string;

  @Column({
    name: 'access_level',
    type: 'enum',
    enum: ModuleAccessLevel,
    default: ModuleAccessLevel.LOCKED,
  })
  accessLevel: ModuleAccessLevel;

  @ManyToOne(() => Plan, (plan) => plan.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
