import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AgentTaskStatus } from '@/modules/tasks/enums/agent-task-status.enum';
import { AgentTaskType } from '@/modules/tasks/enums/agent-task-type.enum';

export type AgentTaskDocument = AgentTask & Document;

@Schema({ timestamps: true, collection: 'agent_tasks' })
export class AgentTask {
  @Prop({ required: true, type: String })
  businessId: string;

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
  startedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: Number })
  tokensUsed: number;

  @Prop({ type: Number })
  durationMs: number;
}

export const AgentTaskSchema = SchemaFactory.createForClass(AgentTask);

// Índices para búsqueda rápida
AgentTaskSchema.index({ businessId: 1, createdAt: -1 });
AgentTaskSchema.index({ status: 1 });
