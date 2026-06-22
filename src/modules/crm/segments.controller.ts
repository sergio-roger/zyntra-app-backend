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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@ApiTags('crm-segments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_segments')
@Controller('crm/segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all segments for the business' })
  findAll(@CurrentBusiness() business: Business) {
    return this.segmentsService.findAll(business);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a segment detail' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.segmentsService.findOne(business, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new segment' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a segment' })
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
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.segmentsService.remove(business, id);
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Get contacts belonging to a segment' })
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
  previewContacts(
    @CurrentBusiness() business: Business,
    @Body('conditions') conditions: any[],
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
