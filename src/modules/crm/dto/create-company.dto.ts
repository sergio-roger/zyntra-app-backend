import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
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

  @ApiPropertyOptional({ example: 'RUC' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  taxType?: string;

  @ApiPropertyOptional({ example: '1-50' })
  @IsString()
  @IsOptional()
  employeeRange?: string;

  @ApiPropertyOptional({ example: 'Empresa líder en distribución industrial' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-del-sector' })
  @IsUUID()
  @IsOptional()
  industryId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-lifecycle-stage' })
  @IsUUID()
  @IsOptional()
  lifecycleStageId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-owner' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    example: { industria: 'manufactura', pais: 'Ecuador' },
  })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
