import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  MaxLength,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '@/common/transformers/string.transformer';
import { ContactStage } from '@crm/enums/contact-stage.enum';
import { ContactSource } from '@crm/enums/contact-source.enum';

export class CreateContactDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+34 600 000 000' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ enum: ContactStage, default: ContactStage.LEAD })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(ContactStage)
  stage?: ContactStage;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  lifecycle_stage_id?: string;

  @ApiPropertyOptional({ enum: ContactSource, default: ContactSource.MANUAL })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(ContactSource)
  source?: ContactSource;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, any>;

}
