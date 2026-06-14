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
import { Business } from '@auth/entities/business.entity';

export enum LifecycleStageType {
  ACTIVE = 'active',
  LOST = 'lost',
}

@Entity({ name: 'lifecycle_stages', schema: 'public' })
@Index(['business_id', 'position'])
export class LifecycleStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ nullable: true })
  icon: string;

  @Column('int', { default: 0 })
  position: number;

  @Column({
    type: 'enum',
    enum: LifecycleStageType,
    default: LifecycleStageType.ACTIVE,
  })
  type: LifecycleStageType;

  @Column({ default: false })
  is_default: boolean;

  @Column({ default: false })
  is_won: boolean;

  @Column({ default: false })
  is_system: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
