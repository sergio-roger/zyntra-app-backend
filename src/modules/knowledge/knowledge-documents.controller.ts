import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import { UserRole } from '@crm/enums/user-role.enum';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { KnowledgeService } from '@/modules/knowledge/knowledge.service';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // techo global, el límite real del plan se valida en el service

@ApiTags('Knowledge')
@ApiBearerAuth()
@RequiresModule('automations_agents_knowledge')
@Controller('businesses/:businessId/agents/:agentId/knowledge/documents')
export class KnowledgeDocumentsController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Sube un documento a la base de conocimiento del agente' })
  @ApiCreatedResponse({ description: 'Documento creado en estado pending' })
  upload(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.uploadDocument(
      businessId,
      agentId,
      file,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista los documentos de conocimiento del agente' })
  @ApiOkResponse({ description: 'Array de documentos' })
  findAll(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.findAll(businessId, agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un documento de conocimiento por ID' })
  findOne(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.findOne(businessId, agentId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un documento de conocimiento' })
  remove(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.remove(businessId, agentId, id);
  }

  @Post(':id/reprocess')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vuelve a encolar el procesamiento de un documento existente',
  })
  reprocess(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.knowledgeService.assertOwnership(req.user.businessId, businessId);
    return this.knowledgeService.reprocess(businessId, agentId, id);
  }
}
