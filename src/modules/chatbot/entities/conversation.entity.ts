import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from '@/modules/channels/entities/channel.entity';
import {
  ConversationMeta,
  ConversationVisitor,
} from '@chatbot/interfaces/conversation.interface';

@Entity({ name: 'conversations', schema: 'messaging' })
@Index('idx_conv_business_last_msg', ['businessId', 'lastMessageAt'])
@Index('idx_conv_business_status', ['businessId', 'status'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => Channel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'channel_id' })
  channelEntity: Channel | null;

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  visitor: ConversationVisitor;

  @Column({ type: 'jsonb', default: {} })
  meta: ConversationMeta;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
