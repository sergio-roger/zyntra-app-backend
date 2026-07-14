import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ServiceTokenGuard } from '@common/guards/service-token.guard';
import { AgentsService } from './agents.service';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/agents')
export class InternalAgentConfigController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get(':agentId/runtime-config')
  @ApiOperation({
    summary:
      'Configuración completa del agente para el runtime (marketing-agents)',
  })
  runtimeConfig(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.agentsService.getRuntimeConfig(agentId);
  }
}
