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
  industryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customFieldFilters?: string;

  @ApiPropertyOptional({ example: 'uuid-lifecycle-stage' })
  @IsUUID()
  @IsOptional()
  lifecycleStageId?: string;
}
