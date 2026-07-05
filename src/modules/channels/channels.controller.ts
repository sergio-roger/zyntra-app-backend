import { ChannelsService } from '@/modules/channels/channels.service';
import { AssignAgentDto } from '@/modules/channels/dto/assign-agent.dto';
import { CreateChannelDto } from '@/modules/channels/dto/create-channel.dto';
import { UpdateChannelDto } from '@/modules/channels/dto/update-channel.dto';
import { Roles } from '@common/decorators/roles.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { UserRole } from '@crm/enums/user-role.enum';
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

@ApiTags('Channels')
@ApiBearerAuth()
@Controller()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('channels/store')
  @ApiOperation({
    summary: 'Lista todos los tipos de canal disponibles (Channel Store)',
  })
  @ApiOkResponse({
    description: 'Array de channel_types ordenados por sort_order',
  })
  getStore() {
    return this.channelsService.getStore();
  }

  @Post('businesses/:businessId/channels')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crea un nuevo canal para el business' })
  @ApiCreatedResponse({ description: 'Canal creado con embedCode (web_chat)' })
  create(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateChannelDto,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.create(businessId, dto);
  }

  @Get('businesses/:businessId/channels')
  @ApiOperation({ summary: 'Lista los canales del business' })
  @ApiOkResponse({ description: 'Array de channels' })
  findAll(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.findAll(businessId);
  }

  @Get('businesses/:businessId/channels/:id')
  @ApiOperation({ summary: 'Obtiene un canal por ID' })
  @ApiOkResponse({ description: 'Canal encontrado' })
  findOne(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.findOne(businessId, id);
  }

  @Patch('businesses/:businessId/channels/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Actualiza un canal' })
  @ApiOkResponse({ description: 'Canal actualizado' })
  update(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.update(businessId, id, dto);
  }

  @Delete('businesses/:businessId/channels/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un canal' })
  @ApiOkResponse({ description: 'Canal eliminado' })
  remove(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.remove(businessId, id);
  }

  @Get('channels/:channelId/embed-snippet')
  @ApiOperation({
    summary: 'Genera el snippet de embed para un canal web_chat específico',
  })
  @ApiOkResponse({ description: 'Snippet HTML listo para copiar' })
  getEmbedSnippet(
    @Req() req: RequestWithUser,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    const businessId = req.user.businessId;
    return this.channelsService.getEmbedSnippet(businessId, channelId);
  }

  @Post('businesses/:businessId/channels/:id/agent')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asigna un agente al canal' })
  @ApiOkResponse({ description: 'Canal actualizado con agent_id' })
  assignAgent(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAgentDto,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.assignAgent(businessId, id, dto.agentId);
  }

  @Delete('businesses/:businessId/channels/:id/agent')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desasigna el agente del canal' })
  @ApiOkResponse({ description: 'Canal actualizado sin agent_id' })
  unassignAgent(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.channelsService.assertOwnership(req.user.businessId, businessId);
    return this.channelsService.unassignAgent(businessId, id);
  }
}
