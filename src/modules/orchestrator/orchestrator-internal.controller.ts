import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ServiceTokenGuard } from '@common/guards/service-token.guard';
import { OrchestratorService } from '@/modules/orchestrator/orchestrator.service';
import { WorkflowRunCallbackDto } from '@/modules/orchestrator/dto/workflow-run-callback.dto';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/orchestrator')
export class OrchestratorInternalController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Callback interno desde marketing-agents — reporta progreso/estado de un workflow_run',
  })
  callback(@Body() dto: WorkflowRunCallbackDto) {
    return this.orchestratorService.handleCallback(dto);
  }
}
