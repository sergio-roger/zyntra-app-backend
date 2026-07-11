import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { SettingsService } from './settings.service';
import { UpdateInboxSoundDto } from './dto/update-inbox-sound.dto';

@ApiTags('chat-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('inbox-sound')
  @ApiOperation({
    summary: 'Get whether the inbox new-message notification sound is enabled',
  })
  @ApiOkResponse({ description: 'Inbox sound setting' })
  async getInboxSound(@CurrentBusiness() business: Business) {
    const enabled = await this.settingsService.getInboxSoundEnabled(
      business.id,
    );
    return { enabled };
  }

  @Put('inbox-sound')
  @ApiOperation({
    summary: 'Enable or disable the inbox new-message notification sound',
  })
  @ApiOkResponse({ description: 'Inbox sound setting updated' })
  async updateInboxSound(
    @CurrentBusiness() business: Business,
    @Body() dto: UpdateInboxSoundDto,
  ) {
    const enabled = await this.settingsService.setInboxSoundEnabled(
      business.id,
      dto.enabled,
    );
    return { enabled };
  }
}
