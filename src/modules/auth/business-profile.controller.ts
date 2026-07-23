import { BusinessProfileService } from '@auth/business-profile.service';
import { UpdateBusinessProfileDto } from '@auth/dto/update-business-profile.dto';
import { Business } from '@auth/entities/business.entity';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('settings-business-profile')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('settings/business-profile')
export class BusinessProfileController {
  constructor(
    private readonly businessProfileService: BusinessProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the business brand/context profile (admin only)' })
  @ApiOkResponse({ description: 'Business profile data' })
  get(@CurrentBusiness() business: Business) {
    return this.businessProfileService.findOrCreate(business.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the business brand/context profile (admin only)' })
  @ApiOkResponse({ description: 'Business profile updated' })
  update(
    @CurrentBusiness() business: Business,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.businessProfileService.update(business.id, dto);
  }
}
