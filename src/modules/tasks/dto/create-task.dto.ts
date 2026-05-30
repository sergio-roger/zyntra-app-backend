import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentTaskType } from '../schemas/agent-task.schema';

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
