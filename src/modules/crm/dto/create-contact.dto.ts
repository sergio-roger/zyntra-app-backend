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

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  lifecycleStageId?: string;

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
  customFields?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'UUID of the CRM user who owns this contact',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;
}
