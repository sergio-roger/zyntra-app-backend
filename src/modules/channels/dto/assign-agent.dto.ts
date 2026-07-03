import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignAgentDto {
  @ApiProperty({ description: 'UUID del agente a asignar' })
  @IsUUID()
  agentId: string;
}
