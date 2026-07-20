import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import { CreateFormTemplateDto } from '@/modules/forms/dto/create-form-template.dto';
import { ReplaceFormFieldsDto } from '@/modules/forms/dto/replace-form-fields.dto';
import { UpdateFormTemplateDto } from '@/modules/forms/dto/update-form-template.dto';
import { FormSubmissionsService } from '@/modules/forms/form-submissions.service';
import { FormTemplatesService } from '@/modules/forms/form-templates.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms/templates')
export class FormTemplatesController {
  constructor(
    private readonly templatesService: FormTemplatesService,
    private readonly submissionsService: FormSubmissionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las plantillas de formulario del negocio' })
  @ApiOkResponse({ description: 'Listado de plantillas' })
  findAll(@CurrentBusiness() business: Business) {
    return this.templatesService.findAll(business);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una plantilla, con sus campos' })
  @ApiOkResponse({ description: 'Plantilla con sus campos ordenados' })
  async findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const template = await this.templatesService.findOne(business, id);
    const fields = await this.templatesService.findFields(business, id);
    return { ...template, fields };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crea una plantilla de formulario' })
  @ApiCreatedResponse({ description: 'Plantilla creada' })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateFormTemplateDto,
  ) {
    return this.templatesService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Actualiza una plantilla de formulario' })
  @ApiOkResponse({ description: 'Plantilla actualizada' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormTemplateDto,
  ) {
    return this.templatesService.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Plantilla eliminada (soft delete)' })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.templatesService.remove(business, id);
  }

  @Put(':id/fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Reemplaza y reordena todos los campos de la plantilla',
  })
  @ApiOkResponse({ description: 'Campos actualizados, en el nuevo orden' })
  replaceFields(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceFormFieldsDto,
  ) {
    return this.templatesService.replaceFields(business, id, dto);
  }

  @Get(':id/submissions')
  @ApiOperation({
    summary: 'Lista los envíos recibidos de una plantilla (paginado)',
  })
  @ApiOkResponse({ description: 'Envíos paginados' })
  listSubmissions(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.submissionsService.listSubmissions(business, id, page, limit);
  }
}
