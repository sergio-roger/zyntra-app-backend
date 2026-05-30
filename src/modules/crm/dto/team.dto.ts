import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, IsArray, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Ventas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Equipo encargado del cierre de tratos' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  member_ids?: string[];
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  member_ids?: string[];
}
