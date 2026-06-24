import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { PipelinesService } from '@crm/pipelines.service';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
} from '@crm/dto/pipeline.dto';

@ApiTags('crm-pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_deals')
@Controller('crm/pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all pipelines (with stages)' })
  list(@CurrentBusiness() business: Business) {
    return this.pipelines.list(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a pipeline' })
  @ApiCreatedResponse()
  create(@CurrentBusiness() business: Business, @Body() dto: CreatePipelineDto) {
    return this.pipelines.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update pipeline name / order / default flag' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelines.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete a pipeline (blocks if it has active deals)',
  })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.pipelines.softDelete(business, id);
  }

  @Get(':id/forecast')
  @ApiOperation({ summary: 'Get weighted pipeline forecast grouped by month' })
  forecast(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pipelines.forecast(business, id);
  }

  // ─── Stages ────────────────────────────────────────────────────────────────

  @Get(':pipelineId/stages')
  @ApiOperation({ summary: 'List stages of a pipeline' })
  listStages(
    @CurrentBusiness() business: Business,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.pipelines.listStages(business, pipelineId);
  }

  @Post(':pipelineId/stages')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  @ApiCreatedResponse()
  createStage(
    @CurrentBusiness() business: Business,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.pipelines.createStage(business, pipelineId, dto);
  }

  @Patch(':pipelineId/stages/reorder')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk reorder stages in a single transaction' })
  reorderStages(
    @CurrentBusiness() business: Business,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.pipelines.reorderStages(business, pipelineId, dto);
  }

  @Patch('stages/:stageId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a stage (name, color, probability, type)' })
  updateStage(
    @CurrentBusiness() business: Business,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelines.updateStage(business, stageId, dto);
  }
}
