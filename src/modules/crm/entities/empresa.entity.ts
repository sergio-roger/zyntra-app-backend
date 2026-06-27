import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  OneToMany,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { Tag } from './tag.entity';
import { SectorTipo } from './sector-tipo.entity';

@Entity({ name: 'empresas', schema: 'crm' })
@Index(['business_id'])
@Index('UQ_business_empresa_name', ['business_id', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Empresa {
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
  identificacion: string | null;

  @Column('varchar', { nullable: true })
  website: string | null;

  @Column('integer', { name: 'num_empleados', nullable: true })
  num_empleados: number | null;

  @Column('text', { nullable: true })
  descripcion: string | null;

  @Column('uuid', { name: 'sector_tipo_id', nullable: true })
  sector_tipo_id: string | null;

  @ManyToOne(() => SectorTipo, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'sector_tipo_id' })
  sector_tipo: SectorTipo | null;

  @Column('uuid', { name: 'lifecycle_stage_id', nullable: true })
  lifecycle_stage_id: string | null;

  @ManyToOne(() => LifecycleStage, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'lifecycle_stage_id' })
  lifecycle_stage: LifecycleStage | null;

  @ManyToMany(() => Tag, { eager: false })
  @JoinTable({
    name: 'empresa_tags',
    schema: 'crm',
    joinColumn: { name: 'empresa_id', referencedColumnName: 'id' },
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
