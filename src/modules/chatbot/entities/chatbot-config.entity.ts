import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '@auth/entities/business.entity';

export enum ChatbotTone {
  FORMAL = 'formal',
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
}

export enum ChatbotLocale {
  ES = 'es',
  EN = 'en',
  PT = 'pt',
}

@Entity({ name: 'chatbot_configs', schema: 'public' })
export class ChatbotConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  business_id: string;

  @OneToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ default: 'Asistente Zyntra' })
  name: string;

  @Column({ type: 'enum', enum: ChatbotTone, default: ChatbotTone.FRIENDLY })
  tone: ChatbotTone;

  @Column('text', { default: '¡Hola! ¿En qué puedo ayudarte hoy?' })
  welcome_message: string;

  @Column('text', { nullable: true })
  system_prompt_extra: string | null;

  @Column('jsonb', { default: [] })
  faqs: Array<{ question: string; answer: string }>;

  @Column('text', { array: true, default: ['web'] })
  active_channels: string[];

  @Column('jsonb', { default: {} })
  theme: Record<string, unknown>;

  @Column({ type: 'enum', enum: ChatbotLocale, default: ChatbotLocale.ES })
  locale: ChatbotLocale;

  @Column({ default: true })
  is_active: boolean;

  @Column('varchar', { nullable: true })
  handoff_email: string | null;

  @Column({ default: 20 })
  rate_limit_per_min: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
