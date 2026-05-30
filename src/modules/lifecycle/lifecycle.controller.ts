import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { LifecycleService } from './lifecycle.service';

@ApiTags('lifecycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @ApiOperation({ summary: 'List all lifecycle stages for the business' })
  @Get('stages')
  findAll(@CurrentBusiness() business: Business) {
    return this.lifecycleService.findAll(business.id);
  }

  @ApiOperation({ summary: 'Update or create lifecycle stages' })
  @Post('stages')
  update(@CurrentBusiness() business: Business, @Body() stages: any[]) {
    return this.lifecycleService.updateStages(business.id, stages);
  }
}
