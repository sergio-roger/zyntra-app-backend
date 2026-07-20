import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { FormStatus } from '@/modules/forms/enums/form-status.enum';
import { FormSubmitAction } from '@/modules/forms/enums/form-submit-action.enum';
import { FormTargetEntityType } from '@/modules/forms/enums/form-target-entity-type.enum';

export class CreateFormTemplateDto {
  @ApiProperty({ example: 'Contacto landing Q3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'contacto-landing-q3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser kebab-case (minúsculas, números y guiones)',
  })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: FormStatus, default: FormStatus.DRAFT })
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @ApiPropertyOptional({
    enum: FormSubmitAction,
    default: FormSubmitAction.CREATE_CONTACT,
  })
  @IsOptional()
  @IsEnum(FormSubmitAction)
  submitAction?: FormSubmitAction;

  @ApiPropertyOptional({ enum: FormTargetEntityType })
  @IsOptional()
  @IsEnum(FormTargetEntityType)
  targetEntityType?: FormTargetEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successMessage?: string;
}
