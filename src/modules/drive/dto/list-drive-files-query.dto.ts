import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

export class ListDriveFilesQueryDto {
  @ApiProperty({ enum: DriveScope })
  @IsEnum(DriveScope)
  scope: DriveScope;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  trashed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  recent?: boolean;
}
