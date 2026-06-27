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
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ListEmpresasDto } from './dto/list-empresas.dto';

@ApiTags('crm-empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_empresas')
@Controller('crm/empresas')
export class EmpresasController {
  constructor(private readonly service: EmpresasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas del negocio' })
  @ApiOkResponse({ description: 'Lista paginada de empresas' })
  list(
    @CurrentBusiness() business: Business,
    @Query() query: ListEmpresasDto,
  ) {
    return this.service.list(business, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una empresa' })
  @ApiOkResponse({ description: 'Empresa encontrada' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(business, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crear una empresa' })
  @ApiCreatedResponse({ description: 'Empresa creada' })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateEmpresaDto,
  ) {
    return this.service.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Actualizar una empresa' })
  @ApiOkResponse({ description: 'Empresa actualizada' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.service.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una empresa (soft delete)' })
  @ApiNoContentResponse({ description: 'Empresa eliminada' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(business, id);
  }
}
