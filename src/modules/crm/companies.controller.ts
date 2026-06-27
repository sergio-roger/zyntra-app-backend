import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ListCompaniesDto } from './dto/list-companies.dto';
import { ExportCompaniesDto, ImportCompanyRowDto } from './dto/export-companies.dto';

@ApiTags('crm-companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_companies')
@Controller('crm/companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiOkResponse({ description: 'Paginated list of companies' })
  list(
    @CurrentBusiness() business: Business,
    @Query() query: ListCompaniesDto,
  ) {
    return this.service.list(business, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company details' })
  @ApiOkResponse({ description: 'Company found' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(business, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a company' })
  @ApiCreatedResponse({ description: 'Company created' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateCompanyDto) {
    return this.service.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a company' })
  @ApiOkResponse({ description: 'Company updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a company (soft delete)' })
  @ApiNoContentResponse({ description: 'Company deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(business, id);
  }

  @Post('export')
  @HttpCode(200)
  @ApiOperation({ summary: 'Export filtered companies as CSV' })
  async exportCsv(
    @CurrentBusiness() business: Business,
    @Body() dto: ExportCompaniesDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.service.exportCsv(business, dto);
    const filename = `empresas_${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk import companies from CSV' })
  @ApiCreatedResponse()
  import(
    @CurrentBusiness() business: Business,
    @Body() rows: ImportCompanyRowDto[],
  ) {
    return this.service.import(business, rows);
  }
}
