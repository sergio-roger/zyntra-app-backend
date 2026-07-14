import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ServiceTokenGuard } from '@common/guards/service-token.guard';
import { KnowledgeService } from '@/modules/knowledge/knowledge.service';
import { KnowledgeCallbackDto } from '@/modules/knowledge/dto/knowledge-callback.dto';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/knowledge')
export class KnowledgeInternalController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Callback interno desde marketing-agents (Fase C) — reporta ready/failed de un documento',
  })
  callback(@Body() dto: KnowledgeCallbackDto) {
    return this.knowledgeService.handleCallback(dto);
  }
}
