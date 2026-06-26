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
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
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
  @ApiOkResponse({ description: 'List of custom fields' })
  findAll(@CurrentBusiness() business: Business) {
    return this.fieldsService.findAll(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a custom field' })
  @ApiCreatedResponse({ description: 'Custom field created' })
  create(
    @CurrentBusiness() business: Business,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.fieldsService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a custom field' })
  @ApiOkResponse({ description: 'Custom field updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.fieldsService.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a custom field' })
  @ApiNoContentResponse({ description: 'Custom field deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fieldsService.remove(business, id);
  }
}
