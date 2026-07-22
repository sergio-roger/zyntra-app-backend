import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemAgentsService } from '@/modules/agents/system-agents.service';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents-catalog')
export class SystemAgentsController {
  constructor(private readonly systemAgentsService: SystemAgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de System Agents (menú Agentes IA)' })
  @ApiOkResponse({ description: 'Array de System Agents' })
  findAll() {
    return this.systemAgentsService.findAll();
  }
}
