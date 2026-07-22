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
import { LifecycleStageType } from '@/modules/lifecycle/enums/lifecycle-stage-type.enum';

@Entity({ name: 'lifecycle_stages', schema: 'settings' })
@Index(['businessId', 'position'])
export class LifecycleStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

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

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_won', default: false })
  isWon: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
