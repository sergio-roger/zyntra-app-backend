import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MoveOrRenameDriveFileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}
