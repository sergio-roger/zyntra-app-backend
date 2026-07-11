import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ChatService } from '@chatbot/chat.service';
import { Public } from '@common/decorators/public.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
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

  @Post('socket-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Emite un token corto para autenticar la conexión WebSocket del agente',
  })
  @ApiOkResponse({ description: 'Token de vida corta (15m)' })
  getSocketToken(@Req() req: RequestWithUser): { token: string } {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return { token: this.chatService.signSocketToken(req.user.id, businessId) };
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
    @Query('assignedToMe') assignedToMe?: string,
    @Query('unread') unread?: string,
  ) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.getConversations(businessId, {
      channelId,
      status,
      assignedToUserId: assignedToMe === 'true' ? req.user.id : undefined,
      unreadOnly: unread === 'true',
    });
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

  @Post('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Un agente humano envía un mensaje manual a la conversación',
  })
  @ApiCreatedResponse({ description: 'Mensaje guardado y emitido por socket' })
  async sendAgentMessage(
    @Req() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Body('content') content: string,
  ): Promise<{ id: string; createdAt: string }> {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.sendAgentMessage(
      businessId,
      conversationId,
      content,
    );
  }

  @Post('conversations/:id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'El agente autenticado se asigna la conversación' })
  async assignConversation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.assignConversationToSelf(businessId, id, {
      id: req.user.id,
      name: req.user.name,
    });
  }

  @Delete('conversations/:id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quita la asignación de la conversación' })
  async unassignConversation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const businessId = req.user.businessId;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.unassignConversation(businessId, id);
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
}
