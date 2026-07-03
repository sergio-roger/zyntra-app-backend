import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TestAgentDto {
  @ApiProperty({ example: '¿Cuáles son sus horarios de atención?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}
