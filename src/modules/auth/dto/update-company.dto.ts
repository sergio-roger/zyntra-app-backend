import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'My Business Name', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'contact@mybusiness.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+593 99 999 9999', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Siempre Viva 123, Quito', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: '1791234567001', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @ApiPropertyOptional({ example: 'https://mybusiness.com' })
  @IsOptional()
  @IsUrl()
  website?: string;
}
