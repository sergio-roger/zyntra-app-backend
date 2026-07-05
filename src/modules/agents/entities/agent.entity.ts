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

export enum AgentTool {
  WEB_SEARCH = 'web_search',
  KNOWLEDGE_BASE = 'knowledge_base',
  LEAD_CAPTURE = 'lead_capture',
  CALENDAR = 'calendar',
}

@Entity({ name: 'agents', schema: 'public' })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column()
  name: string;

  @Column({ default: 'openai/gpt-4o-mini' })
  model: string;

  @Column('text')
  system_prompt: string;

  @Column('float', { default: 0.7 })
  temperature: number;

  @Column('simple-array', { default: '' })
  tools: AgentTool[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
