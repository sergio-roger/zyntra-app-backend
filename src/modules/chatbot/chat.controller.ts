import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ChatService } from '@chatbot/chat.service';
import { ChatRequestDto, ChatResponseDto } from '@chatbot/dto/chat.dto';
import { LeadCaptureDto } from '@chatbot/dto/lead-capture.dto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { UserRole } from '@crm/enums/user-role.enum';
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
  @ApiOperation({ summary: 'Get public chatbot configuration' })
  @ApiOkResponse({ description: 'Public chatbot config' })
  async getPublicConfig(@Query('business_id') businessId: string) {
    return this.chatService.getPublicConfig(businessId);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations (inbox)' })
  @ApiOkResponse({ description: 'List of conversations' })
  async listConversations(
    @Req() req: RequestWithUser,
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
  ) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.getConversations(businessId, { channelId, status });
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation detail with messages' })
  @ApiOkResponse({ description: 'Conversation with messages' })
  async getConversation(@Req() req: RequestWithUser, @Param('id') id: string) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.getConversationDetail(businessId, id);
  }

  @Patch('conversations/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update conversation status (open/closed/bot/human)',
  })
  async updateConversationStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.chatService.updateConversationStatus(businessId, id, status);
  }

  @Get('embed-snippet')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chatbot embed snippet' })
  @ApiOkResponse({ description: 'HTML embed snippet' })
  getEmbedSnippet(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return { snippet: `<script src="/embed.js?b=${businessId}"></script>` };
  }

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send chat message' })
  @ApiOkResponse({ description: 'AI response message' })
  async chat(
    @Body() request: ChatRequestDto,
    @Headers('x-forwarded-for') ip?: string,
  ): Promise<ChatResponseDto> {
    this.logger.debug(
      `chat message received: business_id=${request.business_id ?? 'unknown'} conversation_id=${request.conversation_id ?? 'new'} channel=${request.channel ?? 'web'} length=${request.message.length} ip=${ip ?? 'unknown'}`,
    );
    return this.chatService.processChat(request, ip);
  }

  @Public()
  @Post('lead-capture')
  @ApiOperation({ summary: 'Capture lead from chatbot' })
  @ApiCreatedResponse({ description: 'Lead captured' })
  async leadCapture(@Body() dto: LeadCaptureDto) {
    return this.chatService.captureLead(dto);
  }
}
