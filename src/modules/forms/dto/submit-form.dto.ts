import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFormDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Valores recibidos, indexados por fieldKey',
  })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'widget' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sourceChannel?: string;
}
