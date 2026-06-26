import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { Business } from '@auth/entities/business.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { ContactSource } from '@crm/enums/contact-source.enum';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tag } from './tag.entity';

@Entity({ name: 'contacts', schema: 'crm' })
@Index(['businessId', 'source'])
@Unique('UQ_business_email', ['businessId', 'email'])
@Unique('UQ_business_phone', ['businessId', 'phone'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column('varchar', { nullable: true })
  email: string | null;

  @Column('varchar', { nullable: true })
  phone: string | null;

  @Column('uuid', { name: 'lifecycle_stage_id', nullable: true })
  lifecycleStageId: string | null;

  @ManyToOne(() => LifecycleStage)
  @JoinColumn({ name: 'lifecycle_stage_id' })
  lifecycleStage: LifecycleStage;

  @Column('uuid', { name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => CrmUser, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'owner_id' })
  owner: CrmUser | null;

  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.MANUAL,
  })
  source: ContactSource;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'contact_tags',
    schema: 'crm',
    joinColumn: { name: 'contact_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('varchar', { name: 'company_name', nullable: true })
  companyName: string | null;

  @Column('decimal', {
    name: 'deal_value',
    precision: 12,
    scale: 2,
    default: 0,
  })
  dealValue: number;

  @Column('jsonb', { name: 'custom_fields', nullable: true })
  customFields: Record<string, any> | null;

  @Column('boolean', { name: 'is_archived', default: false })
  isArchived: boolean;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column('timestamp', { name: 'last_activity_at', nullable: true })
  lastActivityAt: Date | null;

  @OneToMany(() => ContactActivity, (a) => a.contact)
  activities: ContactActivity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
