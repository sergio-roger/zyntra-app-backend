import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { KnowledgeService } from '@/modules/knowledge/knowledge.service';

@ApiTags('Knowledge')
@ApiBearerAuth()
@RequiresModule('automations_agents_knowledge')
@Controller('businesses/:businessId/knowledge')
export class KnowledgeUsageController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('usage')
  @ApiOperation({
    summary: 'Documentos y MB usados por el negocio vs. límites del plan',
  })
  @ApiOkResponse({ description: 'Uso actual y límites del plan' })
  getUsage(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.getUsage(businessId);
  }
}
