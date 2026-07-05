import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';

export interface SegmentCondition {
  field: string;
  operator: string;
  value?: string | number | boolean | any[];
}

@Entity({ name: 'segments', schema: 'crm' })
@Index(['business_id'])
export class Segment {
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

  @Column('jsonb', { default: [] })
  conditions: SegmentCondition[];

  @Column({ default: 'dynamic' })
  type: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
