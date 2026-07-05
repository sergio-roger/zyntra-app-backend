import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CrmUsersService } from '@crm/crm-users.service';
import { CreateCrmUserDto, UpdateCrmUserDto } from '@crm/dto/crm-user.dto';
import { UserRole } from '@crm/enums/user-role.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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

@ApiTags('settings-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings/users')
export class CrmUsersController {
  constructor(private readonly usersService: CrmUsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all business users' })
  @ApiOkResponse({ description: 'List of users' })
  list(@CurrentBusiness() business: Business) {
    return this.usersService.list(business);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateCrmUserDto) {
    return this.usersService.create(business, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ description: 'User updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmUserDto,
  ) {
    return this.usersService.update(business, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiNoContentResponse({ description: 'User deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(business, id);
  }
}
