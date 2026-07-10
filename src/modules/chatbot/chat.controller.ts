import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ChatService } from '@chatbot/chat.service';
import { ChatRequestDto, ChatResponseDto } from '@chatbot/dto/chat.dto';
import { LeadCaptureDto } from '@chatbot/dto/lead-capture.dto';
import { ChatRateLimitGuard } from '@chatbot/guards/chat-rate-limit.guard';
import { Public } from '@common/decorators/public.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import type { RequestWithWidgetSession } from '@/modules/widget-session/interfaces/request-with-widget-session.interface';
import { WidgetSessionGuard } from '@/modules/widget-session/widget-session.guard';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Get('public-config')
  @ApiOperation({
    summary:
      'Intercambia un public_key del widget por un widget session token + config pública del canal',
  })
  @ApiOkResponse({ description: 'sessionToken + config pública del canal' })
  async getPublicConfig(
    @Query('public_key') publicKey: string,
    @Query('fp') fp?: string,
    @Headers('origin') origin?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.chatService.exchangeWidgetSession(
      publicKey,
      fp,
      origin,
      referer,
    );
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista las conversaciones (bandeja de entrada)' })
  @ApiOkResponse({ description: 'List of conversations' })
  async listConversations(
    @Req() req: RequestWithUser,
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
  ) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.getConversations(businessId, { channelId, status });
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtiene el detalle de una conversación con sus mensajes',
  })
  @ApiOkResponse({ description: 'Conversation with messages' })
  async getConversation(@Req() req: RequestWithUser, @Param('id') id: string) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.getConversationDetail(businessId, id);
  }

  @Patch('conversations/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualiza el estado de una conversación (open/closed/bot/human)',
  })
  async updateConversationStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.updateConversationStatus(businessId, id, status);
  }

  @Public()
  @UseGuards(WidgetSessionGuard, ChatRateLimitGuard)
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envía un mensaje de chat' })
  @ApiOkResponse({ description: 'AI response message' })
  async chat(
    @Body() request: ChatRequestDto,
    @Req() req: RequestWithWidgetSession,
    @Headers('x-forwarded-for') ip?: string,
  ): Promise<ChatResponseDto> {
    this.logger.debug(
      `chat message received: business_id=${req.widgetSession.businessId} channel_id=${req.widgetSession.channelId} conversation_id=${request.conversation_id ?? 'new'} channel=${request.channel ?? 'web'} length=${request.message.length} ip=${ip ?? 'unknown'}`,
    );
    return this.chatService.processChat(request, req.widgetSession, ip);
  }

  @Public()
  @UseGuards(WidgetSessionGuard)
  @Post('lead-capture')
  @ApiOperation({ summary: 'Captura un lead desde el chat' })
  @ApiCreatedResponse({ description: 'Lead captured' })
  async leadCapture(
    @Body() dto: LeadCaptureDto,
    @Req() req: RequestWithWidgetSession,
  ) {
    return this.chatService.captureLead(dto, req.widgetSession);
  }
}
