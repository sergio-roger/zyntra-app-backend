import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadCaptureDto {
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
    description: 'UUID of the related conversation',
  })
  @IsOptional()
  @IsUUID()
  conversation_id?: string;
}
