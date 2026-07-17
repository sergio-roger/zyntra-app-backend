import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AgentTool } from '../enums/agent-tool.enum';
import { ChatbotTone } from '@/modules/chatbot/enums/chatbot-tone.enum';
import { ChatbotLocale } from '@/modules/chatbot/enums/chatbot-locale.enum';

export class CreateAgentDto {
  @ApiProperty({ example: 'Agente de Ventas' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'openai/gpt-oss-20b:free' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ example: 'Eres un asistente de ventas amable...' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  systemPrompt: string;

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
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ChatbotTone, example: ChatbotTone.FRIENDLY })
  @IsOptional()
  @IsEnum(ChatbotTone)
  tone?: ChatbotTone;

  @ApiPropertyOptional({ enum: ChatbotLocale, example: ChatbotLocale.ES })
  @IsOptional()
  @IsEnum(ChatbotLocale)
  locale?: ChatbotLocale;

  @ApiPropertyOptional({ example: 1024, minimum: 1, maximum: 32000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Configuración libre del motor de voz (Fase C)',
    example: { provider: 'elevenlabs', voiceId: 'abc123' },
  })
  @IsOptional()
  @IsObject()
  voiceConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Configuración libre de memoria/persistencia de contexto',
    example: { strategy: 'summary', maxTurns: 20 },
  })
  @IsOptional()
  @IsObject()
  memoryConfig?: Record<string, unknown>;
}
