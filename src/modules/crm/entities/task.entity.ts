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
import { Contact } from './contact.entity';
import { TaskStatus } from '@crm/enums/task-status.enum';
import { TaskPriority } from '@crm/enums/task-priority.enum';
import { Deal } from './deal.entity';

@Entity({ name: 'tasks', schema: 'crm' })
@Index(['business_id', 'status'])
@Index(['business_id', 'due_date'])
export class CrmTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('timestamp')
  due_date: Date;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column('uuid', { nullable: true })
  contact_id: string | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column('uuid', { nullable: true })
  deal_id: string | null;

  @ManyToOne(() => Deal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal | null;

  @Column('uuid', { nullable: true })
  assigned_to: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
