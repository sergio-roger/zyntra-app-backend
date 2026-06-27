import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  CurrentCrmUser,
  CrmUserContext,
} from '@common/decorators/current-crm-user.decorator';
import { UserPreferencesService } from './user-preferences.service';

@ApiTags('user-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/user/preferences')
export class UserPreferencesController {
  constructor(private readonly preferencesService: UserPreferencesService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get a user preference' })
  async findOne(
    @CurrentCrmUser() user: CrmUserContext,
    @Param('key') key: string,
  ) {
    if (!user.id) {
      throw new NotFoundException('Usuario no identificado');
    }
    const preference = await this.preferencesService.findOne(user.id, key);
    return { data: preference ? preference.value : null };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Create or update a user preference' })
  async upsert(
    @CurrentCrmUser() user: CrmUserContext,
    @Param('key') key: string,
    @Body() body: { value: unknown },
  ) {
    if (!user.id) {
      throw new NotFoundException('Usuario no identificado');
    }
    const preference = await this.preferencesService.upsert(
      user.id,
      key,
      body.value,
    );
    return { data: preference.value };
  }
}
