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
import { SectorTiposService } from './sector-tipos.service';
import { CreateSectorTipoDto } from './dto/create-sector-tipo.dto';
import { UpdateSectorTipoDto } from './dto/update-sector-tipo.dto';

@ApiTags('crm-sector-tipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_empresas')
@Controller('crm/sector-tipos')
export class SectorTiposController {
  constructor(private readonly service: SectorTiposService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de sector del negocio' })
  @ApiOkResponse({ description: 'Lista de sectores' })
  findAll(@CurrentBusiness() business: Business) {
    return this.service.findAll(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crear un tipo de sector' })
  @ApiCreatedResponse({ description: 'Sector creado' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateSectorTipoDto) {
    return this.service.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Actualizar un tipo de sector' })
  @ApiOkResponse({ description: 'Sector actualizado' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectorTipoDto,
  ) {
    return this.service.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un tipo de sector' })
  @ApiNoContentResponse({ description: 'Sector eliminado' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(business, id);
  }
}
