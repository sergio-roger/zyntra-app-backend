import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@ApiTags('Chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get chatbot configuration' })
  @ApiOkResponse({ description: 'Chatbot configuration' })
  async getConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) throw new Error('Business ID not found');
    return this.chatbotService.getConfigByBusiness(businessId);
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update chatbot configuration' })
  @ApiOkResponse({ description: 'Updated configuration' })
  async updateConfig(
    @Req() req: RequestWithUser,
    @Body() updates: Record<string, unknown>,
  ) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) throw new Error('Business ID not found');
    return this.chatbotService.updateConfig(businessId, updates);
  }

  @Post('config')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create default chatbot configuration' })
  @ApiCreatedResponse({ description: 'Configuration created' })
  async createConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) throw new Error('Business ID not found');
    return this.chatbotService.createConfig(businessId);
  }

  @Post('config/ensure')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get or create chatbot configuration' })
  @ApiOkResponse({ description: 'Existing or newly created configuration' })
  async ensureConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) throw new Error('Business ID not found');
    return this.chatbotService.getOrCreateConfig(businessId);
  }
}
