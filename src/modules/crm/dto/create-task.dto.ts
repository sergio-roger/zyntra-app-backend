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
  dueDate: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'uuid-del-contacto' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-deal' })
  @IsUUID()
  @IsOptional()
  dealId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-usuario' })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}
