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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chatbot configuration' })
  async getConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new Error('Business ID not found');
    }
    return this.chatbotService.getConfigByBusiness(businessId);
  }

  @Put('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update chatbot configuration' })
  async updateConfig(
    @Req() req: RequestWithUser,
    @Body() updates: Record<string, unknown>,
  ) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new Error('Business ID not found');
    }
    return this.chatbotService.updateConfig(businessId, updates);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create default chatbot configuration' })
  @HttpCode(HttpStatus.CREATED)
  async createConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new Error('Business ID not found');
    }
    return this.chatbotService.createConfig(businessId);
  }

  @Post('config/ensure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or create chatbot configuration' })
  async ensureConfig(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new Error('Business ID not found');
    }
    return this.chatbotService.getOrCreateConfig(businessId);
  }
}
