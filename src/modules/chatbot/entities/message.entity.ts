import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity({ name: 'messages', schema: 'messaging' })
@Index('idx_msg_conversation_created', ['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversationEntity: Conversation;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  // Encrypted at rest; the service layer owns encrypt/decrypt (next step),
  // this entity only maps the column as-is.
  @Column({ name: 'content_encrypted', type: 'text' })
  contentEncrypted: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  channel: string | null;

  @Column({ name: 'tokens_used', type: 'int', nullable: true })
  tokensUsed: number | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  // Idempotency key set by the agent-service callback; unique only among
  // non-null values (partial index), matching the migration.
  @Column({ name: 'job_id', type: 'varchar', length: 100, nullable: true })
  jobId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
