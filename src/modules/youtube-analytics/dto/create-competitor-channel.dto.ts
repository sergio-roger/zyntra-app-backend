import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompetitorChannelDto {
  @ApiProperty({ example: '@somecompetitor' })
  @IsString()
  @IsNotEmpty()
  channelHandleOrUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  youtubeChannelId?: string;
}
