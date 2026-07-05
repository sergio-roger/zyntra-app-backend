import {
  IsString,
  IsOptional,
  IsUUID,
  IsMongoId,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({
    description: 'Mongo ObjectId of an existing conversation (24 hex chars)',
  })
  @IsOptional()
  @IsMongoId()
  conversation_id?: string;

  @ApiProperty({
    description:
      'UUID of the target Business. Still required for traceability/analytics ' +
      'and as a fallback when channel_id is not provided.',
  })
  @IsUUID()
  business_id: string;

  @ApiPropertyOptional({
    description:
      'UUID of the target Channel (channels.id). Takes priority over ' +
      'business_id for resolving which web_chat channel handles the request.',
  })
  @IsOptional()
  @IsUUID()
  channel_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visitor?: {
    fingerprint?: string;
    page_url?: string;
    referrer?: string;
    user_agent?: string;
  };
}

export class ChatResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversation_id: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({
    description: 'true cuando el reply llegará vía WebSocket (agente asignado)',
  })
  pending?: boolean;

  @ApiProperty()
  created_at: string;
}
