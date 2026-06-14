import { ApiProperty } from '@nestjs/swagger';
import { PlanStatus } from '@auth/entities/business.entity';

class PlanDto {
  @ApiProperty({ example: 'uuid-plan' })
  id: string;

  @ApiProperty({ example: 'Impulse Pro' })
  name: string;

  @ApiProperty({ example: 199.0 })
  price: number;

  @ApiProperty({ example: 'monthly' })
  billing_cycle: string;

  @ApiProperty({ example: 5000 })
  contact_limit: number;

  @ApiProperty({ example: 200 })
  task_limit: number;
}

class UserDataDto {
  @ApiProperty({ example: 'uuid-123-456' })
  id: string;

  @ApiProperty({ example: 'Zyntra Marketing' })
  name: string;

  @ApiProperty({ example: 'test@zyntra.com' })
  email: string;

  @ApiProperty({ type: PlanDto })
  plan: PlanDto;

  @ApiProperty({ enum: PlanStatus, example: PlanStatus.TRIAL })
  plan_status: PlanStatus;
}

class ErrorDto {
  @ApiProperty({ example: 'E0001' })
  code: string;

  @ApiProperty({ example: 'Invalid credentials' })
  description: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty({ type: UserDataDto })
  data: UserDataDto;

  @ApiProperty({ type: [ErrorDto], example: [] })
  errors: ErrorDto[];
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Logged out successfully' })
  message: string;

  @ApiProperty({ example: null })
  data: any;

  @ApiProperty({ type: [ErrorDto], example: [] })
  errors: ErrorDto[];
}
