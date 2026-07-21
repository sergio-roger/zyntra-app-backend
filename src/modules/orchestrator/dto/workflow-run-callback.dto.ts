import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WorkflowRunStatus } from '@/modules/orchestrator/enums/workflow-run-status.enum';

export class WorkflowRunCallbackDto {
  @ApiProperty()
  @IsUUID()
  workflowRunId: string;

  @ApiProperty({ enum: WorkflowRunStatus })
  @IsEnum(WorkflowRunStatus)
  status: WorkflowRunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  steps?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
