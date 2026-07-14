import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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
@Index(['businessId', 'status'])
@Index(['businessId', 'dueDate'])
export class CrmTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

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

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId: string | null;

  @ManyToOne(() => Deal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
