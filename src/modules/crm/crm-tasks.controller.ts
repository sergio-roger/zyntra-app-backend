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
import { CurrentCrmUser } from '@common/decorators/current-crm-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { CrmTasksService } from './crm-tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@crm/enums/task-status.enum';

@ApiTags('crm-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequiresModule('crm_tasks')
@Controller('crm/tasks')
export class CrmTasksController {
  constructor(private readonly tasksService: CrmTasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks (agent sees only their own)' })
  @ApiOkResponse({ description: 'List of tasks' })
  list(
    @CurrentBusiness() business: Business,
    @CurrentCrmUser() caller: { id: string | null; role: UserRole },
    @Query('status') status?: TaskStatus,
    @Query('contact_id') contact_id?: string,
  ) {
    return this.tasksService.list(business, { status, contact_id }, caller);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created' })
  create(@CurrentBusiness() business: Business, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(business, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (agent limited to own tasks)' })
  @ApiOkResponse({ description: 'Task updated' })
  update(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentCrmUser() caller: { id: string | null; role: UserRole },
  ) {
    return this.tasksService.update(business, id, dto, caller);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  remove(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(business, id);
  }
}
