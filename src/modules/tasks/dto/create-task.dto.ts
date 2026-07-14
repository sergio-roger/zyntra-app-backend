import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentTaskType } from '../enums/agent-task-type.enum';

export class CreateTaskDto {
  @ApiProperty({ enum: AgentTaskType })
  @IsEnum(AgentTaskType)
  @IsNotEmpty()
  type: AgentTaskType;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  input?: any;
}
