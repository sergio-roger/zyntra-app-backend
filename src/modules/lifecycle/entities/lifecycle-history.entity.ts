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
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';

@Entity({ name: 'lifecycle_history', schema: 'lifecycle' })
@Index(['contactId', 'createdAt'])
export class LifecycleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'old_stage_id', type: 'uuid', nullable: true })
  oldStageId: string | null;

  @ManyToOne(() => LifecycleStage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'old_stage_id' })
  oldStage: LifecycleStage | null;

  @Column({ name: 'new_stage_id', type: 'uuid' })
  newStageId: string;

  @ManyToOne(() => LifecycleStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'new_stage_id' })
  newStage: LifecycleStage;

  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  changedById: string | null;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
