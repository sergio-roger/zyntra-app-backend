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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

@ApiTags('crm-fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/fields')
export class CustomFieldsController {
  constructor(private readonly fieldsService: CustomFieldsService) {}

  @Get()
  @ApiOperation({ summary: 'List all custom fields' })
  findAll(@CurrentBusiness() business: Business) {
    return this.fieldsService.findAll(business);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom field' })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.fieldsService.create(business, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom field' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.fieldsService.update(business, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a custom field' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fieldsService.remove(business, id);
  }
}
