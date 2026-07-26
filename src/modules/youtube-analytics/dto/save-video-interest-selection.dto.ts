import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SaveVideoInterestSelectionDto {
  @ApiProperty({ type: [String], minItems: 3 })
  @IsArray()
  @ArrayMinSize(3)
  @IsString({ each: true })
  interestIds: string[];
}
