import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AgentTaskDocument = AgentTask & Document;

export enum AgentTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AgentTaskType {
  CONTENT = 'content',
  SOCIAL = 'social',
  CHATBOT = 'chatbot',
  CRM_ANALYSIS = 'crm_analysis',
  REPORT = 'report',
}

@Schema({ timestamps: true, collection: 'agent_tasks' })
export class AgentTask {
  @Prop({ required: true, type: String })
  business_id: string;

  @Prop({
    required: true,
    enum: AgentTaskType,
  })
  type: AgentTaskType;

  @Prop({
    required: true,
    enum: AgentTaskStatus,
    default: AgentTaskStatus.PENDING,
  })
  status: AgentTaskStatus;

  @Prop({ type: MongooseSchema.Types.Mixed })
  input: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  output: any;

  @Prop({ type: String })
  error: string;

  @Prop({ type: Date })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Number })
  tokens_used: number;

  @Prop({ type: Number })
  duration_ms: number;
}

export const AgentTaskSchema = SchemaFactory.createForClass(AgentTask);

// Índices para búsqueda rápida
AgentTaskSchema.index({ business_id: 1, createdAt: -1 });
AgentTaskSchema.index({ status: 1 });
