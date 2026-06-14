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
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@ApiTags('settings-teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  list(@CurrentBusiness() business: Business) {
    return this.teamsService.list(business);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(business, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(business, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamsService.remove(business, id);
  }
}
