import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { emptyToUndefined } from '@/common/transformers/string.transformer';
import { DealStage } from '@crm/enums/deal-stage.enum';
import { DealStatus } from '@crm/enums/deal-status.enum';

export class CreateDealDto {
  @ApiProperty({ example: 'Implementación Plan Premium' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Detalle de la oportunidad de negocio', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1500.50 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ enum: DealStage, default: DealStage.PROSPECTING })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiProperty({ enum: DealStatus, default: DealStatus.OPEN })
  @IsEnum(DealStatus)
  @IsOptional()
  status?: DealStatus;

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

  @ApiProperty({ example: 50, minimum: 0, maximum: 100, default: 0 })
  @IsNumber()
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

  @ApiProperty({ example: 1500.50, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiProperty({ enum: DealStage, default: DealStage.PROSPECTING, required: false })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

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

  @ApiProperty({ enum: DealStage, required: false })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

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

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
