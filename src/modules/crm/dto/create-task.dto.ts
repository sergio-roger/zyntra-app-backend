import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { TaskPriority } from '@crm/enums/task-priority.enum';

export class CreateTaskDto {
  @ApiProperty({ example: 'Llamar a cliente' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Discutir propuesta de servicio' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-05-01T10:00:00Z' })
  @IsDateString()
  due_date: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'uuid-del-contacto' })
  @IsUUID()
  @IsOptional()
  contact_id?: string;

  @ApiPropertyOptional({ example: 'uuid-del-usuario' })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;
}
