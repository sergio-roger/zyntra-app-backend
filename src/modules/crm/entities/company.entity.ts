import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { Business } from '@auth/entities/business.entity';
import { SectorType } from '@crm/entities/sector-type.entity';
import { Tag } from '@crm/entities/tag.entity';
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
@Index(['business_id'])
@Index(['business_id', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Company {
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
  identification: string | null;

  @Column('varchar', { nullable: true })
  website: string | null;

  @Column('integer', { name: 'num_employees', nullable: true })
  num_employees: number | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('uuid', { name: 'sector_type_id', nullable: true })
  sector_type_id: string | null;

  @ManyToOne(() => SectorType, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'sector_type_id' })
  sector_type: SectorType | null;

  @Column('uuid', { name: 'lifecycle_stage_id', nullable: true })
  lifecycle_stage_id: string | null;

  @ManyToOne(() => LifecycleStage, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'lifecycle_stage_id' })
  lifecycle_stage: LifecycleStage | null;

  @ManyToMany(() => Tag, { eager: false })
  @JoinTable({
    name: 'company_tags',
    schema: 'crm',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @Column('jsonb', { name: 'custom_fields', nullable: true })
  custom_fields: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
