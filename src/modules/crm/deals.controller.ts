import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { DealsService } from '@crm/deals.service';
import { CreateDealDto, UpdateDealDto, ListDealsDto } from '@crm/dto/deal.dto';

@ApiTags('crm-deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_deals')
@Controller('crm/deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @ApiOperation({
    summary: 'List deals (paginated, filterable by pipeline/stage/status/team)',
  })
  @ApiOkResponse({ description: 'Paginated list of deals' })
  list(@CurrentBusiness() business: Business, @Query() query: ListDealsDto) {
    return this.deals.list(business, query);
  }

  @Get('kanban/:pipelineId')
  @ApiOperation({
    summary: 'Kanban board — open deals grouped by stage for a pipeline',
  })
  @ApiOkResponse({ description: 'Deals grouped by stage' })
  kanban(
    @CurrentBusiness() business: Business,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.deals.kanban(business, pipelineId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiCreatedResponse()
  create(@CurrentBusiness() business: Business, @Body() dto: CreateDealDto) {
    return this.deals.create(business, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal details' })
  @ApiOkResponse({ description: 'Deal detail' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.findOne(business, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get deal stage history (velocity tracking)' })
  @ApiOkResponse({ description: 'Stage history entries' })
  stageHistory(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.stageHistory(business, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a deal (move stage triggers DealStageHistory + status)',
  })
  @ApiOkResponse({ description: 'Updated deal' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a deal' })
  @ApiNoContentResponse({ description: 'Deal deleted' })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.deals.remove(business, id);
  }
}
