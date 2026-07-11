import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AgentCallbackDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty()
  @IsString()
  businessId: string;

  @ApiProperty({
    description: 'Idempotency key — must be unique per assistant message',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  jobId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32000)
  reply: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tokensUsed?: number;
}
