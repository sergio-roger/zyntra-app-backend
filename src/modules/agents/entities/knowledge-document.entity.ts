import { Agent } from '@/modules/agents/entities/agent.entity';
import { KnowledgeDocumentStatus } from '@/modules/agents/enums/knowledge-document-status.enum';
import { Business } from '@auth/entities/business.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'knowledge_documents', schema: 'workflows' })
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  // Nullable: the row is created in 'pending' status BEFORE calling the
  // storage microservice, so we have our own id to use as entityId for
  // POST /storage/upload. Filled in once that call returns.
  @Column({ name: 'storage_file_id', type: 'uuid', nullable: true })
  storageFileId: string;

  @Column({
    type: 'enum',
    enum: KnowledgeDocumentStatus,
    default: KnowledgeDocumentStatus.PENDING,
  })
  status: KnowledgeDocumentStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'chunk_count', type: 'int', default: 0 })
  chunkCount: number;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;
}
