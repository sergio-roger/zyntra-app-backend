import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { TestAgentDto } from './dto/test-agent.dto';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('businesses/:businessId/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crea un agente de IA' })
  @ApiCreatedResponse({ description: 'Agente creado' })
  create(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateAgentDto,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los agentes del business' })
  @ApiOkResponse({ description: 'Array de agentes' })
  findAll(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un agente por ID' })
  findOne(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Actualiza un agente' })
  update(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Elimina un agente (falla si está asignado a un canal activo)',
  })
  remove(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.remove(businessId, id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Prueba el agente en sandbox (sin persistir conversación)',
  })
  @ApiOkResponse({ description: 'Respuesta del agente' })
  test(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestAgentDto,
  ) {
    this.agentsService.assertOwnership(
      (req.user as { id: string }).id,
      businessId,
    );
    return this.agentsService.sandboxTest(businessId, id, dto.message);
  }
}
