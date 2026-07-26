import { Business } from '@auth/entities/business.entity';
import { BudgetRange } from '@auth/enums/budget-range.enum';
import { BusinessModel } from '@auth/enums/business-model.enum';
import { BrandTone } from '@auth/enums/brand-tone.enum';
import { GeographicScope } from '@auth/enums/geographic-scope.enum';
import { PrimaryGoal } from '@auth/enums/primary-goal.enum';
import type { BrandColors } from '@auth/interfaces/brand-colors.interface';
import { Industry } from '@crm/entities/industry.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'business_profiles', schema: 'security' })
export class BusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid', unique: true })
  businessId: string;

  @OneToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'industry_id', type: 'uuid', nullable: true })
  industryId: string | null;

  @ManyToOne(() => Industry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'industry_id' })
  industry: Industry | null;

  @Column({ name: 'niche_detail', length: 150, default: '' })
  nicheDetail: string;

  @Column({ name: 'value_proposition', length: 600, default: '' })
  valueProposition: string;

  @Column({ type: 'varchar', length: 600, nullable: true })
  mission: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  competitors: string[];

  @Column({ name: 'target_audience', length: 800, default: '' })
  targetAudience: string;

  @Column({
    name: 'audience_age_range',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  audienceAgeRange: string | null;

  @Column({
    name: 'business_model',
    type: 'varchar',
    length: 20,
    default: BusinessModel.B2C,
  })
  businessModel: BusinessModel;

  @Column({
    name: 'geographic_scope',
    type: 'varchar',
    length: 20,
    default: GeographicScope.LOCAL,
  })
  geographicScope: GeographicScope;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 30, default: BrandTone.FRIENDLY })
  tone: BrandTone;

  @Column({
    name: 'brand_voice_notes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  brandVoiceNotes: string | null;

  @Column({ length: 10, default: 'es' })
  locale: string;

  @Column({ name: 'brand_colors', type: 'jsonb', nullable: true })
  brandColors: BrandColors | null;

  @Column({
    name: 'primary_goal',
    type: 'varchar',
    length: 30,
    default: PrimaryGoal.LEADS,
  })
  primaryGoal: PrimaryGoal;

  @Column({
    name: 'monthly_budget_range',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  monthlyBudgetRange: BudgetRange | null;

  @Column({
    name: 'active_channels',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  activeChannels: string[];

  @Column({ name: 'team_size', type: 'int', nullable: true })
  teamSize: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
