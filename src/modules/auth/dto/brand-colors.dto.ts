import { HEX_COLOR_REGEX } from '@auth/constants/business-profile.constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class BrandColorsDto {
  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX)
  primary?: string;

  @ApiPropertyOptional({ example: '#7c3aed' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX)
  secondary?: string;

  @ApiPropertyOptional({ example: '#b95f00' })
  @IsOptional()
  @Matches(HEX_COLOR_REGEX)
  accent?: string;
}
