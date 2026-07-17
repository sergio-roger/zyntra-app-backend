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
import { ChatbotTone } from '@/modules/chatbot/enums/chatbot-tone.enum';
import { ChatbotLocale } from '@/modules/chatbot/enums/chatbot-locale.enum';

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

  @Column({ default: 'openai/gpt-oss-20b:free' })
  model: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column('float', { default: 0.7 })
  temperature: number;

  @Column('simple-array', { default: '' })
  tools: AgentTool[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  tone: ChatbotTone | null;

  @Column({ type: 'varchar', nullable: true })
  locale: ChatbotLocale | null;

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
