import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  conversation_id: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  tokens_used: number;

  @Prop()
  latency_ms: number;

  @Prop()
  model: string;

  @Prop()
  channel: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation_id: 1, createdAt: -1 });
