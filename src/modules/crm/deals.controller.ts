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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { DealsService } from '@crm/deals.service';
import { CreateDealDto, UpdateDealDto, ListDealsDto } from '@crm/dto/deal.dto';

@ApiTags('crm-deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List deals (paginated, filterable)' })
  list(@CurrentBusiness() business: Business, @Query() query: ListDealsDto) {
    return this.deals.list(business, query);
  }

  @Get('kanban')
  @ApiOperation({
    summary: 'List open deals grouped by stage for Kanban board',
  })
  kanban(@CurrentBusiness() business: Business) {
    return this.deals.kanban(business);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiCreatedResponse()
  create(@CurrentBusiness() business: Business, @Body() dto: CreateDealDto) {
    return this.deals.create(business, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal details' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.findOne(business, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.update(business, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a deal' })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.deals.remove(business, id);
  }
}
