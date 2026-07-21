import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ServiceTokenGuard } from '@common/guards/service-token.guard';
import { CrmInternalService } from '@crm/crm-internal.service';
import { InternalCreateLeadDto } from '@crm/dto/internal/internal-create-lead.dto';
import { InternalCreateTaskDto } from '@crm/dto/internal/internal-create-task.dto';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/crm')
export class CrmInternalController {
  constructor(private readonly crmInternalService: CrmInternalService) {}

  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tool createLead (Tool Registry, System Agents) — crea un contact con source=agent',
  })
  createLead(@Body() dto: InternalCreateLeadDto) {
    return this.crmInternalService.createLead(dto);
  }

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tool createTask (Tool Registry, System Agents) — crea una task con created_by_agent_id',
  })
  createTask(@Body() dto: InternalCreateTaskDto) {
    return this.crmInternalService.createTask(dto);
  }
}
