import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contact } from '@crm/entities/contact.entity';
import { LifecycleStage } from './lifecycle-stage.entity';

@Entity({ name: 'lifecycle_history', schema: 'public' })
@Index(['contact_id', 'created_at'])
export class LifecycleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contact_id: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column('uuid', { nullable: true })
  old_stage_id: string | null;

  @ManyToOne(() => LifecycleStage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'old_stage_id' })
  old_stage: LifecycleStage | null;

  @Column('uuid')
  new_stage_id: string;

  @ManyToOne(() => LifecycleStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'new_stage_id' })
  new_stage: LifecycleStage;

  @Column('uuid', { nullable: true })
  changed_by_id: string | null;

  @Column('text', { nullable: true })
  change_reason: string | null;

  @CreateDateColumn()
  created_at: Date;
}
