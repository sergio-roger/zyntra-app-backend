import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactSource } from '@crm/enums/contact-source.enum';

export class ListContactsDto {
  @ApiPropertyOptional({ description: 'UUID of the lifecycle stage' })
  @IsOptional()
  @IsUUID()
  lifecycleStageId?: string;

  @ApiPropertyOptional({ enum: ContactSource })
  @IsOptional()
  @IsEnum(ContactSource)
  source?: ContactSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the owner, or "unassigned" for contacts without an owner',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime — filter contacts created on or after this date' })
  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime — filter contacts created on or before this date' })
  @IsOptional()
  @IsDateString()
  createdAtTo?: string;
}
