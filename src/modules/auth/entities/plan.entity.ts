import { Business } from '@auth/entities/business.entity';
import { PlanDescription } from '@auth/entities/plan-description.entity';
import { PlanModule } from '@auth/entities/plan-module.entity';
import { BillingCycle } from '@auth/enums/billing-cycle.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'plans', schema: 'security' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Column({ name: 'is_popular', default: false })
  isPopular: boolean;

  @Column({ name: 'contact_limit', default: 0 })
  contactLimit: number;

  @Column({ name: 'task_limit', default: 0 })
  taskLimit: number;

  @Column({ name: 'user_limit', default: 1 })
  userLimit: number;

  @Column({ name: 'ai_agent_limit', default: 0 })
  aiAgentLimit: number;

  @Column({ name: 'chatbot_limit', default: 0 })
  chatbotLimit: number;

  @Column({ name: 'funnel_limit', default: 0 })
  funnelLimit: number;

  @Column({ name: 'channel_limit', default: 1 })
  channelLimit: number;

  @Column({ name: 'pipeline_limit', default: 0 })
  pipelineLimit: number;

  @Column({ name: 'stripe_price_id', nullable: true })
  stripePriceId: string;

  // KB (knowledge base / RAG) limits per plan — see plans.data.ts.
  @Column({ name: 'kb_max_documents_per_agent', default: 0 })
  kbMaxDocumentsPerAgent: number;

  @Column({ name: 'kb_max_file_size_mb', default: 0 })
  kbMaxFileSizeMb: number;

  // Canales de competencia monitoreables en YouTube Analytics (canal propio no cuenta).
  @Column({ name: 'youtube_competitor_limit', default: 0 })
  youtubeCompetitorLimit: number;

  @OneToMany(() => PlanDescription, (desc) => desc.plan, { cascade: true })
  descriptions: PlanDescription[];

  @OneToMany(() => Business, (business) => business.plan_object)
  businesses: Business[];

  @OneToMany(() => PlanModule, (pm) => pm.plan, { cascade: true, eager: true })
  modules: PlanModule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
