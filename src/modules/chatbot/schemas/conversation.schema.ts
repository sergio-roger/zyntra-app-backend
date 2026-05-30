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
    enum: ['web', 'whatsapp', 'instagram', 'email'],
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
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ business_id: 1, last_message_at: -1 });
ConversationSchema.index({ business_id: 1, status: 1 });
