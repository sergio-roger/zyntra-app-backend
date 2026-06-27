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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { CurrentCrmUser } from '@common/decorators/current-crm-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import type { CrmUserContext } from '@common/decorators/current-crm-user.decorator';
import { ContactsService } from '@crm/contacts.service';
import { CreateContactDto } from '@crm/dto/create-contact.dto';
import { UpdateContactDto } from '@crm/dto/update-contact.dto';
import { ListContactsDto } from '@crm/dto/list-contacts.dto';
import { ExportContactsDto } from '@crm/dto/export-contacts.dto';
import { CreateActivityDto } from '@crm/dto/create-activity.dto';
import { ConvertToDealDto } from '@crm/dto/deal.dto';
import { ActivityType } from '@crm/enums/activity-type.enum';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_contacts')
@Controller('crm')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'List contacts (paginated, filterable)' })
  @ApiOkResponse({ description: 'Paginated list of contacts' })
  list(@CurrentBusiness() business: Business, @Query() query: ListContactsDto) {
    return this.contacts.list(business, query);
  }

  @Get('members')
  @ApiOperation({ summary: 'List active business users for owner assignment' })
  @ApiOkResponse({ description: 'List of active users' })
  listMembers(@CurrentBusiness() business: Business) {
    return this.contacts.listMembers(business);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiCreatedResponse()
  create(
    @CurrentBusiness() business: Business,
    @CurrentCrmUser() crmUser: CrmUserContext,
    @Body() dto: CreateContactDto,
  ) {
    return this.contacts.create(business, dto, crmUser.id);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get contact details' })
  @ApiOkResponse({ description: 'Contact detail' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.findOne(business, id);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiOkResponse({ description: 'Contact updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(business, id, dto);
  }

  @Delete('contacts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a contact' })
  @ApiNoContentResponse({ description: 'Contact deleted' })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contacts.remove(business, id);
  }

  @Get('contacts/:id/activities')
  @ApiOperation({ summary: 'List activities for a contact' })
  @ApiOkResponse({ description: 'Paginated activity list' })
  listActivities(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: ActivityType,
  ) {
    return this.contacts.listActivities(
      business,
      id,
      Number(page) || 1,
      Number(limit) || 20,
      type,
    );
  }

  @Post('contacts/:id/activities')
  @ApiOperation({ summary: 'Add an activity to a contact' })
  @ApiCreatedResponse()
  addActivity(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.contacts.addActivity(business, id, dto);
  }

  @Patch('contacts/:id/archive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Archive a lead' })
  @ApiOkResponse({ description: 'Contact archived' })
  archive(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.archive(business, id);
  }

  @Post('contacts/:id/convert-to-deal')
  @ApiOperation({ summary: 'Convert a lead to a deal' })
  @ApiCreatedResponse()
  convertToDeal(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertToDealDto,
  ) {
    return this.contacts.convertToDeal(business, id, dto);
  }

  @Post('contacts/export')
  @HttpCode(200)
  @ApiOperation({ summary: 'Export filtered contacts as CSV' })
  async exportCsv(
    @CurrentBusiness() business: Business,
    @Body() dto: ExportContactsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.contacts.exportCsv(business, dto);
    const filename = `contactos_${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Post('contacts/import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Import multiple contacts' })
  @ApiCreatedResponse()
  import(
    @CurrentBusiness() business: Business,
    @Body() contacts: CreateContactDto[],
  ) {
    return this.contacts.import(business, contacts);
  }
}
