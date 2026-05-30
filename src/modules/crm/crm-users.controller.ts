import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { CrmUsersService } from './crm-users.service';
import { CreateCrmUserDto, UpdateCrmUserDto } from './dto/crm-user.dto';

@ApiTags('settings-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings/users')
export class CrmUsersController {
  constructor(private readonly usersService: CrmUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all business users' })
  list(@CurrentBusiness() business: Business) {
    return this.usersService.list(business);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateCrmUserDto) {
    return this.usersService.create(business, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmUserDto,
  ) {
    return this.usersService.update(business, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@CurrentBusiness() business: Business, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(business, id);
  }
}
