import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { AgentsService } from '@/modules/agents/agents.service';
import { BusinessSystemAgentsService } from '@/modules/agents/business-system-agents.service';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('businesses/:businessId/system-agents')
export class BusinessSystemAgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly businessSystemAgentsService: BusinessSystemAgentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'System Agents importados por el negocio (Equipo de Agentes)' })
  @ApiOkResponse({ description: 'Array de agentes importados' })
  findImported(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    this.agentsService.assertOwnership(req.user.businessId, businessId);
    return this.businessSystemAgentsService.findImported(businessId);
  }

  @Post(':systemAgentId/import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Importa un System Agent al Equipo de Agentes del negocio' })
  @ApiCreatedResponse({ description: 'Agente importado' })
  importAgent(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('systemAgentId', ParseUUIDPipe) systemAgentId: string,
  ) {
    this.agentsService.assertOwnership(req.user.businessId, businessId);
    return this.businessSystemAgentsService.importAgent(
      businessId,
      systemAgentId,
    );
  }
}
