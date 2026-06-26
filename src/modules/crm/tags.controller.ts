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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@ApiTags('crm-tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_tags')
@Controller('crm/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags for the business' })
  @ApiOkResponse({ description: 'List of tags' })
  findAll(@CurrentBusiness() business: Business) {
    return this.tagsService.findAll(business);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiCreatedResponse({ description: 'Tag created' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateTagDto) {
    return this.tagsService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a tag' })
  @ApiOkResponse({ description: 'Tag updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiNoContentResponse({ description: 'Tag deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tagsService.remove(business, id);
  }
}
