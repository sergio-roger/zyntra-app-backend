import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ServiceTokenGuard } from '@common/guards/service-token.guard';
import { SystemAgentsService } from './system-agents.service';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/system-agents')
export class InternalSystemAgentConfigController {
  constructor(private readonly systemAgentsService: SystemAgentsService) {}

  @Get(':systemAgentId/runtime-config')
  @ApiOperation({
    summary: 'Tools del System Agent para el runtime (marketing-agents)',
  })
  runtimeConfig(@Param('systemAgentId', ParseUUIDPipe) systemAgentId: string) {
    return this.systemAgentsService.getRuntimeConfig(systemAgentId);
  }
}
