import {
  IsString,
  IsEmail,
  IsOptional,
  IsMongoId,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadCaptureDto {
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
