import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSegmentDto {
  @ApiProperty({ example: 'Leads de WhatsApp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Leads que entraron por WhatsApp con interés en plan pro',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: [{ field: 'source', operator: 'equals', value: 'whatsapp' }],
  })
  @IsArray()
  @IsNotEmpty()
  conditions: any[];
}
