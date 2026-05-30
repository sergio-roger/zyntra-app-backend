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
@Index(['contact_id', 'created_at'])
export class ContactActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contact_id: string;

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
    type: 'enum',
    enum: ActivityCreatedBy,
    default: ActivityCreatedBy.USER,
  })
  created_by: ActivityCreatedBy;

  @CreateDateColumn()
  created_at: Date;
 
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
