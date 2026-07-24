import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';

export class CreateDriveFolderDto {
  @ApiProperty({ enum: DriveScope })
  @IsEnum(DriveScope)
  scope: DriveScope;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
