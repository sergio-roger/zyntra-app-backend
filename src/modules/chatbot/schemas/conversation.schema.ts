import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ collection: 'conversations', timestamps: true })
export class Conversation {
  @Prop({ required: true, index: true })
  business_id: string;

  @Prop({ index: true })
  contact_id: string;

  @Prop({
    required: true,
    enum: ['web', 'web_chat', 'whatsapp', 'instagram', 'email'],
    default: 'web',
  })
  channel: string;

  @Prop({
    required: true,
    enum: ['open', 'closed', 'bot', 'human'],
    default: 'open',
  })
  status: string;

  @Prop({ type: Object })
  visitor: {
    name?: string;
    fingerprint?: string;
    ip_hash?: string;
    user_agent?: string;
    page_url?: string;
    referrer?: string;
  };

  @Prop()
  started_at: Date;

  @Prop()
  last_message_at: Date;

  @Prop()
  ended_at: Date;

  @Prop({ type: Object })
  meta: {
    handoff_reason?: string;
    tags?: string[];
  };

  // Added Phase 4: links conversation to a Channel entity (PostgreSQL UUID)
  @Prop({ index: true })
  channel_id: string;

  // Agent (security.users UUID) that claimed this conversation. Name is
  // denormalized at assignment time to avoid a Postgres join on every list read.
  @Prop({ type: String, default: null, index: true })
  assigned_to: string | null;

  @Prop({ type: String, default: null })
  assigned_to_name: string | null;

  // Role of the most recent message, kept in sync on every message write so
  // "unread" (last message came from the visitor, unanswered) is a flat read.
  @Prop()
  last_message_role: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ business_id: 1, last_message_at: -1 });
ConversationSchema.index({ business_id: 1, status: 1 });
