import { Business } from '@auth/entities/business.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentBusiness } from '@common/decorators/current-business.decorator';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) { }

  @Post()
  @ApiOperation({ summary: 'Launch a new AI agent task' })
  @ApiCreatedResponse()
  create(@CurrentBusiness() business: Business, @Body() dto: CreateTaskDto) {
    console.log(
      'DEBUG: Recibida petición de tarea para negocio:',
      business?.id,
    );
    return this.tasks.create(business.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks for the current business' })
  findAll(@CurrentBusiness() business: Business) {
    return this.tasks.findAll(business.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and output of a specific task' })
  findOne(@CurrentBusiness() business: Business, @Param('id') id: string) {
    return this.tasks.findOne(id, business.id);
  }
}
