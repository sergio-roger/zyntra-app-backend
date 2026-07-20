import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { CustomFieldType } from '@crm/enums/custom-field-type.enum';
import { FORM_MAPPING_PATTERN } from '@/modules/forms/constants/form-field-mapping.constants';
import { FormFieldValidation } from '@/modules/forms/interfaces/form-field-validation.interface';

export class FormFieldDto {
  @ApiPropertyOptional({
    description: 'Provisto si se está actualizando un campo existente',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'nombre_completo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'fieldKey debe ser snake_case (minúsculas, números y guiones bajos)',
  })
  fieldKey: string;

  @ApiProperty({ example: 'Nombre completo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description:
      "'contact.email' | 'contact.name' | 'contact.phone' | 'contact.jobTitle' | " +
      "'contact.custom.<name>' | 'company.name' | 'company.website' | " +
      "'company.custom.<name>' | 'deal.value'",
  })
  @IsOptional()
  @IsString()
  @Matches(FORM_MAPPING_PATTERN, { message: 'mapsTo inválido' })
  mapsTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation?: FormFieldValidation;
}
