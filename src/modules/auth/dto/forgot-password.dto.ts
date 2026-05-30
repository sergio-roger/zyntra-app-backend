import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'contact@mybusiness.com' })
  @IsEmail()
  email: string;
}
