import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkflowRunDto {
  @ApiProperty({ example: 'Lanzar una campaña de captación de leads B2B' })
  @IsString()
  @IsNotEmpty()
  goal: string;
}
