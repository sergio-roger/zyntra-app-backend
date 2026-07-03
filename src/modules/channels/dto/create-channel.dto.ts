import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsObject,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ description: 'UUID del ChannelType (ej. id de web_chat)' })
  @IsUUID()
  channelTypeId: string;

  @ApiProperty({ description: 'Nombre descriptivo del canal', example: 'Chat Principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Configuración específica del canal (validada por el provider)' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
