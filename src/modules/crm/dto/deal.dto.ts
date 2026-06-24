import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { emptyToUndefined } from '@/common/transformers/string.transformer';
import { DealStatus } from '@crm/enums/deal-status.enum';

export class CreateDealDto {
  @ApiProperty({ example: 'Implementación Plan Premium' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Detalle de la oportunidad de negocio', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: 'USD', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'uuid-del-pipeline' })
  @IsUUID()
  pipeline_id: string;

  @ApiProperty({ example: 'uuid-de-la-fase' })
  @IsUUID()
  stage_id: string;

  @ApiProperty({ example: 'uuid-del-contacto' })
  @IsUUID()
  contact_id: string;

  @ApiProperty({ example: 'uuid-del-usuario', required: false })
  @IsUUID()
  @IsOptional()
  assigned_to_id?: string;

  @ApiProperty({ example: 'uuid-del-equipo', required: false })
  @IsUUID()
  @IsOptional()
  team_id?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @Transform(emptyToUndefined)
  @IsDateString()
  @IsOptional()
  expected_close_date?: string;

  @ApiProperty({ example: 50, minimum: 0, maximum: 100, required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;
}

export class UpdateDealDto extends PartialType(CreateDealDto) {}

export class ConvertToDealDto {
  @ApiProperty({ example: 'Implementación Plan Premium' })
  @IsString()
  title: string;

  @ApiProperty({ example: 1500.5, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiProperty({ example: 'uuid-del-pipeline' })
  @IsUUID()
  pipeline_id: string;

  @ApiProperty({ example: 'uuid-de-la-fase' })
  @IsUUID()
  stage_id: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @Transform(emptyToUndefined)
  @IsDateString()
  @IsOptional()
  expected_close_date?: string;

  @ApiProperty({ required: false })
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  description?: string;
}

export class ListDealsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  pipeline_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  stage_id?: string;

  @ApiProperty({ enum: DealStatus, required: false })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  contact_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assigned_to_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
