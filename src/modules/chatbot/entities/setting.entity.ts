import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';

@Entity({ name: 'settings', schema: 'security' })
@Index(['business_id', 'key'], { unique: true })
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column('jsonb', { default: {} })
  value: unknown;

  @UpdateDateColumn()
  updated_at: Date;
}
