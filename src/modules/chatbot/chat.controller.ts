import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatResponseDto } from './dto/chat.dto';
import { LeadCaptureDto } from './dto/lead-capture.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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

  @Post('lead-capture')
  @ApiOperation({ summary: 'Capture lead from chatbot' })
  async leadCapture(@Body() dto: LeadCaptureDto) {
    return this.chatService.captureLead(dto);
  }
}
