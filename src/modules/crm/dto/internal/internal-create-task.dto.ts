import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TaskPriority } from '@crm/enums/task-priority.enum';

// Llamado por la tool createTask (Tool Registry, System Agents). agentId es
// requerido: es lo que queda en tasks.created_by_agent_id para trazabilidad
// (ver 20260721_add_agent_traceability_to_crm.sql).
export class InternalCreateTaskDto {
  @ApiProperty()
  @IsUUID()
  businessId: string;

  @ApiProperty()
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: 'Llamar a cliente' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Discutir propuesta de servicio' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-08-01T10:00:00Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'uuid-del-contacto' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-deal' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-usuario' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
