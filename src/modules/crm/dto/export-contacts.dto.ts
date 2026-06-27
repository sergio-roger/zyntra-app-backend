import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactSource } from '@crm/enums/contact-source.enum';

export class ExportColumnDto {
  @IsString()
  key: string;

  @IsString()
  label: string;
}

export class ExportContactsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContactSource)
  source?: ContactSource;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  lifecycleStageId?: string;

  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @IsOptional()
  @IsDateString()
  createdAtTo?: string;

  @IsOptional()
  @IsDateString()
  lastActivityAtFrom?: string;

  @IsOptional()
  @IsDateString()
  lastActivityAtTo?: string;

  @IsOptional()
  @IsString()
  customFieldFilters?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportColumnDto)
  columns: ExportColumnDto[];
}
