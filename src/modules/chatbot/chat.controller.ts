import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
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
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { LeadCaptureDto } from './dto/lead-capture.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Get('public-config')
  @ApiOperation({ summary: 'Get public chatbot configuration' })
  async getPublicConfig(@Query('business_id') businessId: string) {
    return this.chatService.getPublicConfig(businessId);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations' })
  async listConversations(@Req() req: RequestWithUser) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.chatService.getConversations(businessId);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(@Req() req: RequestWithUser, @Param('id') id: string) {
    const businessId = (req.user as { id?: string }).id;
    if (!businessId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.chatService.getConversationDetail(businessId, id);
  }

  @Get('embed-snippet')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chatbot embed snippet' })
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
  async chat(
    @Body() request: ChatRequestDto,
    @Headers('x-forwarded-for') ip?: string,
  ): Promise<ChatResponseDto> {
    console.log(request);
    return this.chatService.processChat(request, ip);
  }

  @Public()
  @Post('lead-capture')
  @ApiOperation({ summary: 'Capture lead from chatbot' })
  async leadCapture(@Body() dto: LeadCaptureDto) {
    return this.chatService.captureLead(dto);
  }
}
