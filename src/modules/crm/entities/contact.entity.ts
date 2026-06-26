import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { Tag } from './tag.entity';
import { ContactActivity } from '@crm/entities/contact-activity.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { CrmUser } from '@crm/entities/user.entity';
import { ContactStage } from '@crm/enums/contact-stage.enum';
import { ContactSource } from '@crm/enums/contact-source.enum';

@Entity({ name: 'contacts', schema: 'crm' })
@Index(['business_id', 'stage'])
@Index(['business_id', 'source'])
@Unique('UQ_business_email', ['business_id', 'email'])
@Unique('UQ_business_phone', ['business_id', 'phone'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column('varchar', { nullable: true })
  email: string | null;

  @Column('varchar', { nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: ContactStage,
    nullable: true,
  })
  stage: ContactStage | null;

  @Column('uuid', { nullable: true })
  lifecycle_stage_id: string | null;

  @ManyToOne(() => LifecycleStage)
  @JoinColumn({ name: 'lifecycle_stage_id' })
  lifecycle_stage: LifecycleStage;

  @Column('uuid', { nullable: true })
  owner_id: string | null;

  @ManyToOne(() => CrmUser, { nullable: true, onDelete: 'SET NULL', eager: false })
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

  @Column('varchar', { nullable: true })
  company_name: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  deal_value: number;

  @Column('jsonb', { nullable: true })
  custom_fields: Record<string, any> | null;

  @Column('boolean', { default: false })
  is_archived: boolean;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column('timestamp', { nullable: true })
  last_activity_at: Date | null;

  @OneToMany(() => ContactActivity, (a) => a.contact)
  activities: ContactActivity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
