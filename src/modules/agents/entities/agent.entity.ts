import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';
import { AgentTool } from '@/modules/agents/enums/agent-tool.enum';

@Entity({ name: 'agents', schema: 'public' })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column({ default: 'openai/gpt-4o-mini' })
  model: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column('float', { default: 0.7 })
  temperature: number;

  @Column('simple-array', { default: '' })
  tools: AgentTool[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  tone: string;

  @Column({ nullable: true })
  locale: string;

  @Column({ name: 'max_tokens', type: 'int', default: 1024 })
  maxTokens: number;

  @Column({ name: 'knowledge_collection', nullable: true })
  knowledgeCollection: string;

  @Column({ name: 'voice_config', type: 'jsonb', nullable: true })
  voiceConfig: Record<string, unknown>;

  @Column({ name: 'memory_config', type: 'jsonb', nullable: true })
  memoryConfig: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
