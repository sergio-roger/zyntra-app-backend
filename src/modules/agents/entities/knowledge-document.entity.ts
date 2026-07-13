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
import { Agent } from '@/modules/agents/entities/agent.entity';

export enum KnowledgeDocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity({ name: 'knowledge_documents', schema: 'public' })
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column('uuid')
  agent_id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column()
  file_name: string;

  @Column()
  file_type: string;

  @Column('bigint')
  file_size_bytes: number;

  // Nullable: the row is created in 'pending' status BEFORE calling the
  // storage microservice, so we have our own id to use as entityId for
  // POST /storage/upload. Filled in once that call returns.
  @Column('uuid', { nullable: true })
  storage_file_id: string;

  @Column({
    type: 'enum',
    enum: KnowledgeDocumentStatus,
    default: KnowledgeDocumentStatus.PENDING,
  })
  status: KnowledgeDocumentStatus;

  @Column('text', { nullable: true })
  error_message: string;

  @Column('int', { default: 0 })
  chunk_count: number;

  @Column('int', { default: 0 })
  token_count: number;

  @Column('uuid')
  uploaded_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('timestamptz', { nullable: true })
  processed_at: Date;
}
