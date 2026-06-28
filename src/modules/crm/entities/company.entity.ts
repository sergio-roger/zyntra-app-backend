import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { Business } from '@auth/entities/business.entity';
import { Industry } from '@crm/entities/industry.entity';
import { Tag } from '@crm/entities/tag.entity';
import { CrmUser } from '@crm/entities/user.entity';
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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'companies', schema: 'crm' })
@Index(['businessId'])
@Index(['businessId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Company {
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
  identification: string | null;

  @Column('varchar', { name: 'tax_type', nullable: true })
  taxType: string | null;

  @Column('varchar', { nullable: true })
  website: string | null;

  @Column('varchar', { name: 'employee_range', nullable: true })
  employeeRange: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('uuid', { name: 'industry_id', nullable: true })
  industryId: string | null;

  @ManyToOne(() => Industry, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'industry_id' })
  industry: Industry | null;

  @Column('uuid', { name: 'lifecycle_stage_id', nullable: true })
  lifecycleStageId: string | null;

  @ManyToOne(() => LifecycleStage, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'lifecycle_stage_id' })
  lifecycleStage: LifecycleStage | null;

  @Column('uuid', { name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => CrmUser, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'owner_id' })
  owner: CrmUser | null;

  @ManyToMany(() => Tag, { eager: false })
  @JoinTable({
    name: 'company_tags',
    schema: 'crm',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @Column('jsonb', { name: 'custom_fields', nullable: true })
  customFields: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
