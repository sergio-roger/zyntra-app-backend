import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListCompaniesDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'Acme' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  owner_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tax_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_range?: string;

  @ApiPropertyOptional({ example: 'uuid-lifecycle-stage' })
  @IsUUID()
  @IsOptional()
  lifecycle_stage_id?: string;
}
