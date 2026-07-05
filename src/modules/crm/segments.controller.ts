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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import { SegmentCondition } from './entities/segment.entity';

@ApiTags('crm-segments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_segments')
@Controller('crm/segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all segments for the business' })
  @ApiOkResponse({ description: 'List of segments' })
  findAll(@CurrentBusiness() business: Business) {
    return this.segmentsService.findAll(business);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a segment detail' })
  @ApiOkResponse({ description: 'Segment detail' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.segmentsService.findOne(business, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new segment' })
  @ApiCreatedResponse({ description: 'Segment created' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a segment' })
  @ApiOkResponse({ description: 'Segment updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segmentsService.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a segment' })
  @ApiNoContentResponse({ description: 'Segment deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.segmentsService.remove(business, id);
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Get contacts belonging to a segment' })
  @ApiOkResponse({ description: 'Paginated contacts in the segment' })
  getContacts(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.segmentsService.getSegmentContacts(
      business,
      id,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Preview contacts matching the provided conditions',
  })
  @ApiOkResponse({ description: 'Paginated preview of matching contacts' })
  previewContacts(
    @CurrentBusiness() business: Business,
    @Body('conditions') conditions: SegmentCondition[],
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.segmentsService.previewContacts(
      business,
      conditions || [],
      Number(page || 1),
      Number(limit || 20),
    );
  }
}
