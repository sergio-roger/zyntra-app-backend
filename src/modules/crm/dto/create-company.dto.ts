import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp S.A.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: '0912345678001' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  identification?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsInt()
  @Min(1)
  @IsOptional()
  num_employees?: number;

  @ApiPropertyOptional({ example: 'Empresa líder en distribución industrial' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-del-sector' })
  @IsUUID()
  @IsOptional()
  sector_type_id?: string;

  @ApiPropertyOptional({ example: 'uuid-del-lifecycle-stage' })
  @IsUUID()
  @IsOptional()
  lifecycle_stage_id?: string;

  @ApiPropertyOptional({ type: [String], example: ['uuid-tag-1', 'uuid-tag-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tag_ids?: string[];

  @ApiPropertyOptional({ example: { industria: 'manufactura', pais: 'Ecuador' } })
  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;
}
