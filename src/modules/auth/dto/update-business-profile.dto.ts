import {
  MAX_ACTIVE_CHANNELS,
  MAX_AUDIENCE_AGE_RANGE_LENGTH,
  MAX_BRAND_VOICE_NOTES_LENGTH,
  MAX_CITY_LENGTH,
  MAX_COMPETITOR_LENGTH,
  MAX_COMPETITORS,
  MAX_COUNTRY_LENGTH,
  MAX_LOCALE_LENGTH,
  MAX_MISSION_LENGTH,
  MAX_NICHE_DETAIL_LENGTH,
  MAX_TARGET_AUDIENCE_LENGTH,
  MAX_VALUE_PROPOSITION_LENGTH,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  VALID_ACTIVE_CHANNEL_KEYS,
} from '@auth/constants/business-profile.constants';
import { BudgetRange } from '@auth/enums/budget-range.enum';
import { BusinessModel } from '@auth/enums/business-model.enum';
import { BrandTone } from '@auth/enums/brand-tone.enum';
import { GeographicScope } from '@auth/enums/geographic-scope.enum';
import { PrimaryGoal } from '@auth/enums/primary-goal.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BrandColorsDto } from '@auth/dto/brand-colors.dto';

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional({ example: 'uuid-de-la-industria' })
  @IsOptional()
  @IsUUID()
  industryId?: string;

  @ApiPropertyOptional({ maxLength: MAX_NICHE_DETAIL_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NICHE_DETAIL_LENGTH)
  nicheDetail?: string;

  @ApiPropertyOptional({ maxLength: MAX_VALUE_PROPOSITION_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VALUE_PROPOSITION_LENGTH)
  valueProposition?: string;

  @ApiPropertyOptional({ maxLength: MAX_MISSION_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MISSION_LENGTH)
  mission?: string;

  @ApiPropertyOptional({ type: [String], maxItems: MAX_COMPETITORS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_COMPETITORS)
  @IsString({ each: true })
  @MaxLength(MAX_COMPETITOR_LENGTH, { each: true })
  competitors?: string[];

  @ApiPropertyOptional({ maxLength: MAX_TARGET_AUDIENCE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TARGET_AUDIENCE_LENGTH)
  targetAudience?: string;

  @ApiPropertyOptional({ maxLength: MAX_AUDIENCE_AGE_RANGE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_AUDIENCE_AGE_RANGE_LENGTH)
  audienceAgeRange?: string;

  @ApiPropertyOptional({ enum: BusinessModel })
  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;

  @ApiPropertyOptional({ enum: GeographicScope })
  @IsOptional()
  @IsEnum(GeographicScope)
  geographicScope?: GeographicScope;

  @ApiPropertyOptional({ maxLength: MAX_COUNTRY_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_COUNTRY_LENGTH)
  country?: string;

  @ApiPropertyOptional({ maxLength: MAX_CITY_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CITY_LENGTH)
  city?: string;

  @ApiPropertyOptional({ enum: BrandTone })
  @IsOptional()
  @IsEnum(BrandTone)
  tone?: BrandTone;

  @ApiPropertyOptional({ maxLength: MAX_BRAND_VOICE_NOTES_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BRAND_VOICE_NOTES_LENGTH)
  brandVoiceNotes?: string;

  @ApiPropertyOptional({ maxLength: MAX_LOCALE_LENGTH, example: 'es' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LOCALE_LENGTH)
  locale?: string;

  @ApiPropertyOptional({ type: BrandColorsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandColorsDto)
  brandColors?: BrandColorsDto;

  @ApiPropertyOptional({ enum: PrimaryGoal })
  @IsOptional()
  @IsEnum(PrimaryGoal)
  primaryGoal?: PrimaryGoal;

  @ApiPropertyOptional({ enum: BudgetRange })
  @IsOptional()
  @IsEnum(BudgetRange)
  monthlyBudgetRange?: BudgetRange;

  @ApiPropertyOptional({ type: [String], maxItems: MAX_ACTIVE_CHANNELS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ACTIVE_CHANNELS)
  @IsIn(VALID_ACTIVE_CHANNEL_KEYS, { each: true })
  activeChannels?: string[];

  @ApiPropertyOptional({ minimum: TEAM_SIZE_MIN, maximum: TEAM_SIZE_MAX })
  @IsOptional()
  @IsInt()
  @Min(TEAM_SIZE_MIN)
  @Max(TEAM_SIZE_MAX)
  teamSize?: number;
}
