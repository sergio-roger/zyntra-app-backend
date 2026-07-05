import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsMongoId,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadCaptureDto {
  @ApiProperty({
    description:
      'UUID of the target Business. Still required for traceability/analytics ' +
      'and as a fallback when channel_id is not provided.',
  })
  @IsUUID()
  @IsNotEmpty()
  business_id: string;

  @ApiPropertyOptional({
    description: 'UUID of the target Channel (channels.id), takes priority over business_id.',
  })
  @IsOptional()
  @IsUUID()
  channel_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Mongo ObjectId of the related conversation (24 hex chars)',
  })
  @IsOptional()
  @IsMongoId()
  conversation_id?: string;
}
