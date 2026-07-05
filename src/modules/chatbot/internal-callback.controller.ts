import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ChatService } from './chat.service';
import { AgentCallbackDto } from './dto/agent-callback.dto';

@ApiTags('Internal')
@Controller('internal')
export class InternalCallbackController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post('agent-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Callback interno desde agent-service — persiste el reply del agente',
  })
  async agentCallback(
    @Headers('x-service-token') serviceToken: string,
    @Body() dto: AgentCallbackDto,
  ) {
    if (!serviceToken) {
      throw new UnauthorizedException('Missing service token');
    }
    return this.chatService.handleAgentCallback({
      conversationId: dto.conversationId,
      businessId: dto.businessId,
      jobId: dto.jobId,
      reply: dto.reply,
      model: dto.model,
      tokensUsed: dto.tokensUsed,
      serviceToken,
    });
  }
}
