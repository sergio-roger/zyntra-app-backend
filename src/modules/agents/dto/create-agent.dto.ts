import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AgentTool } from '../entities/agent.entity';

export class CreateAgentDto {
  @ApiProperty({ example: 'Agente de Ventas' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'openai/gpt-4o-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ example: 'Eres un asistente de ventas amable...' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  system_prompt: string;

  @ApiPropertyOptional({ example: 0.7, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({ enum: AgentTool, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AgentTool, { each: true })
  tools?: AgentTool[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
