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
import { ContactsService } from '@crm/contacts.service';
import { CreateContactDto } from '@crm/dto/create-contact.dto';
import { UpdateContactDto } from '@crm/dto/update-contact.dto';
import { ListContactsDto } from '@crm/dto/list-contacts.dto';
import { CreateActivityDto } from '@crm/dto/create-activity.dto';
import { ConvertToDealDto } from '@crm/dto/deal.dto';
import { ActivityType } from '@crm/enums/activity-type.enum';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'List contacts (paginated, filterable)' })
  list(@CurrentBusiness() business: Business, @Query() query: ListContactsDto) {
    return this.contacts.list(business, query);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Contact count grouped by stage' })
  pipeline(@CurrentBusiness() business: Business) {
    return this.contacts.pipeline(business);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'List contacts grouped by stage for Kanban board' })
  kanban(@CurrentBusiness() business: Business) {
    return this.contacts.kanban(business);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiCreatedResponse()
  create(@CurrentBusiness() business: Business, @Body() dto: CreateContactDto) {
    return this.contacts.create(business, dto);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get contact details' })
  findOne(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.findOne(business, id);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(business, id, dto);
  }

  @Delete('contacts/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a contact' })
  async remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contacts.remove(business, id);
  }

  @Get('contacts/:id/activities')
  @ApiOperation({ summary: 'List activities for a contact' })
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
  @ApiOperation({ summary: 'Archive a lead' })
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

  @Post('contacts/import')
  @ApiOperation({ summary: 'Import multiple contacts' })
  @ApiCreatedResponse()
  import(
    @CurrentBusiness() business: Business,
    @Body() contacts: CreateContactDto[],
  ) {
    return this.contacts.import(business, contacts);
  }
}
