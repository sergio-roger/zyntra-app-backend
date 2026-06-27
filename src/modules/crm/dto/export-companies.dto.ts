import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExportCompanyColumnDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;
}

export class ExportCompaniesDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sector_type_id?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  lifecycle_stage_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdAtFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdAtTo?: string;

  @ApiPropertyOptional({ type: [ExportCompanyColumnDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportCompanyColumnDto)
  columns: ExportCompanyColumnDto[];
}

export class ImportCompanyRowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  identification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  num_employees?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
