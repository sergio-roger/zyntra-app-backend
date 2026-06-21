import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { LifecycleService } from '@/modules/lifecycle/lifecycle.service';

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
  update(
    @CurrentBusiness() business: Business,
    @Body() stages: Partial<LifecycleStage>[],
  ) {
    return this.lifecycleService.updateStages(business.id, stages);
  }
}
