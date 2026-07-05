import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ChatService } from '@chatbot/chat.service';
import { ChatRequestDto, ChatResponseDto } from '@chatbot/dto/chat.dto';
import { LeadCaptureDto } from '@chatbot/dto/lead-capture.dto';
import { ChatRateLimitGuard } from '@chatbot/guards/chat-rate-limit.guard';
import { Public } from '@common/decorators/public.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
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
  @ApiOperation({ summary: 'Obtiene la configuración pública del canal/chat' })
  @ApiOkResponse({ description: 'Public chat config' })
  async getPublicConfig(
    @Query('business_id') businessId: string,
    @Query('channel_id') channelId?: string,
    @Headers('origin') origin?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.chatService.getPublicConfig(
      businessId,
      channelId,
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
  @UseGuards(ChatRateLimitGuard)
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envía un mensaje de chat' })
  @ApiOkResponse({ description: 'AI response message' })
  async chat(
    @Body() request: ChatRequestDto,
    @Headers('x-forwarded-for') ip?: string,
    @Headers('origin') origin?: string,
    @Headers('referer') referer?: string,
  ): Promise<ChatResponseDto> {
    this.logger.debug(
      `chat message received: business_id=${request.business_id ?? 'unknown'} channel_id=${request.channel_id ?? 'none'} conversation_id=${request.conversation_id ?? 'new'} channel=${request.channel ?? 'web'} length=${request.message.length} ip=${ip ?? 'unknown'}`,
    );
    return this.chatService.processChat(request, ip, origin, referer);
  }

  @Public()
  @Post('lead-capture')
  @ApiOperation({ summary: 'Captura un lead desde el chat' })
  @ApiCreatedResponse({ description: 'Lead captured' })
  async leadCapture(
    @Body() dto: LeadCaptureDto,
    @Headers('origin') origin?: string,
    @Headers('referer') referer?: string,
  ) {
    return this.chatService.captureLead(dto, origin, referer);
  }
}
