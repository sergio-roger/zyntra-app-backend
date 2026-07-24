import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';

export class ListChildrenQueryDto {
  @ApiProperty({ enum: DriveScope })
  @IsEnum(DriveScope)
  scope: DriveScope;
}
