import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Contact } from '@crm/entities/contact.entity';
import { ActivityType } from '@crm/enums/activity-type.enum';
import { ActivityCreatedBy } from '@crm/enums/activity-created-by.enum';

@Entity({ name: 'activities', schema: 'crm' })
@Index(['contactId', 'createdAt'])
export class ContactActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Contact, (c) => c.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column('text')
  content: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, unknown>;

  @Column({
    name: 'created_by',
    type: 'enum',
    enum: ActivityCreatedBy,
    default: ActivityCreatedBy.USER,
  })
  createdBy: ActivityCreatedBy;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
