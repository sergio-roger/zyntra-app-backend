import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LifecycleStage } from '@/modules/lifecycle/entities/lifecycle-stage.entity';
import { LifecycleService } from '@/modules/lifecycle/lifecycle.service';

@ApiTags('lifecycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Get('stages')
  @ApiOperation({ summary: 'List all lifecycle stages for the business' })
  @ApiOkResponse({ description: 'List of lifecycle stages' })
  findAll(@CurrentBusiness() business: Business) {
    return this.lifecycleService.findAll(business.id);
  }

  @Post('stages')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update or create lifecycle stages' })
  @ApiOkResponse({ description: 'Updated lifecycle stages' })
  update(
    @CurrentBusiness() business: Business,
    @Body() stages: Partial<LifecycleStage>[],
  ) {
    return this.lifecycleService.updateStages(business.id, stages);
  }
}
