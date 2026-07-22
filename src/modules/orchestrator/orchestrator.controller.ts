import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { OrchestratorService } from '@/modules/orchestrator/orchestrator.service';
import { CreateWorkflowRunDto } from '@/modules/orchestrator/dto/create-workflow-run.dto';

@ApiTags('Orchestrator')
@ApiBearerAuth()
@Controller('businesses/:businessId/orchestrator/runs')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  @ApiOperation({ summary: 'Dispara una corrida del Orchestrator (Planner + System Agent)' })
  create(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateWorkflowRunDto,
  ) {
    this.assertOwnership(req, businessId);
    return this.orchestratorService.enqueueRun(businessId, dto.goal);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Estado/resultado de una corrida del Orchestrator' })
  @ApiOkResponse({ description: 'WorkflowRun' })
  findOne(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertOwnership(req, businessId);
    return this.orchestratorService.findOneForBusiness(businessId, id);
  }

  private assertOwnership(req: RequestWithUser, businessId: string) {
    if (req.user.businessId !== businessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }
}
