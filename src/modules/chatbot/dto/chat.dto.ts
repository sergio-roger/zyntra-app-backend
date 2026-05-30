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

  @ApiPropertyOptional({ description: 'UUID of the target Business' })
  @IsOptional()
  @IsUUID()
  business_id?: string;

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

  @ApiProperty()
  created_at: string;
}
