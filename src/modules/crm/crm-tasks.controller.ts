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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Business } from '@auth/entities/business.entity';
import { CrmTasksService } from './crm-tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@crm/enums/task-status.enum';

@ApiTags('crm-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/tasks')
export class CrmTasksController {
  constructor(private readonly tasksService: CrmTasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks' })
  list(
    @CurrentBusiness() business: Business,
    @Query('status') status?: TaskStatus,
    @Query('contact_id') contact_id?: string,
  ) {
    return this.tasksService.list(business, { status, contact_id });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(business, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(business, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(business, id);
  }
}
