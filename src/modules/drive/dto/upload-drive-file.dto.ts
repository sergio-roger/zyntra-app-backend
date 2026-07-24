import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';

export class UploadDriveFileDto {
  @ApiProperty({ enum: DriveScope })
  @IsEnum(DriveScope)
  scope: DriveScope;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;
}
