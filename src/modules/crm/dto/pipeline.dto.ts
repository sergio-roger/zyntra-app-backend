import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsHexColor,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PipelineStageType } from '@crm/enums/pipeline-stage-type.enum';

// ─── Pipeline DTOs ────────────────────────────────────────────────────────────

export class CreatePipelineDto {
  @ApiProperty({ example: 'Ventas Nuevas' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}

// ─── Stage DTOs ───────────────────────────────────────────────────────────────

export class CreateStageDto {
  @ApiProperty({ example: 'Negociación' })
  @IsString()
  name: string;

  @ApiProperty({ example: '#6366f1', required: false })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiProperty({ enum: PipelineStageType, required: false })
  @IsEnum(PipelineStageType)
  @IsOptional()
  type?: PipelineStageType;

  @ApiProperty({ example: 40, minimum: 0, maximum: 100, required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability_percent?: number;
}

export class UpdateStageDto extends PartialType(CreateStageDto) {}

// ─── Reorder DTOs ─────────────────────────────────────────────────────────────

export class StagePositionDto {
  @ApiProperty({ example: 'uuid-de-la-fase' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StagePositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StagePositionDto)
  stages: StagePositionDto[];
}
