import {
  IsString,
  IsOptional,
  IsMongoId,
  IsObject,
  IsUUID,
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
    deprecated: true,
    description:
      'Legacy fallback only — ignored when x-widget-session is present. ' +
      'Resolved by WidgetSessionGuard, never read here.',
  })
  @IsOptional()
  @IsUUID()
  business_id?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Legacy fallback only — ignored when x-widget-session is present. ' +
      'Resolved by WidgetSessionGuard, never read here.',
  })
  @IsOptional()
  @IsUUID()
  channel_id?: string;

  @ApiPropertyOptional({
    description: 'Mongo ObjectId of an existing conversation (24 hex chars)',
  })
  @IsOptional()
  @IsMongoId()
  conversation_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({
    description:
      'Visitor metadata for analytics only — identity (fingerprint) comes ' +
      'from the signed widget session, not from here.',
  })
  @IsOptional()
  @IsObject()
  visitor?: {
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
