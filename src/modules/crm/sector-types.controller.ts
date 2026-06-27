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
import { SectorTypesService } from './sector-types.service';
import { CreateSectorTypeDto } from './dto/create-sector-type.dto';
import { UpdateSectorTypeDto } from './dto/update-sector-type.dto';

@ApiTags('crm-sector-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_companies') // update permissions module reference
@Controller('crm/sector-types')
export class SectorTypesController {
  constructor(private readonly service: SectorTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List sector types' })
  @ApiOkResponse({ description: 'List of sector types' })
  findAll(@CurrentBusiness() business: Business) {
    return this.service.findAll(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a sector type' })
  @ApiCreatedResponse({ description: 'Sector type created' })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateSectorTypeDto,
  ) {
    return this.service.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a sector type' })
  @ApiOkResponse({ description: 'Sector type updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectorTypeDto,
  ) {
    return this.service.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a sector type' })
  @ApiNoContentResponse({ description: 'Sector type deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(business, id);
  }
}
