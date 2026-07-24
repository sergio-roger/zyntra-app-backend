import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequiresModule } from '@common/decorators/requires-module.decorator';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';
import { CreateDriveFolderDto } from '@/modules/drive/dto/create-drive-folder.dto';
import { ListChildrenQueryDto } from '@/modules/drive/dto/list-children-query.dto';
import { ListDriveFilesQueryDto } from '@/modules/drive/dto/list-drive-files-query.dto';
import { MoveOrRenameDriveFileDto } from '@/modules/drive/dto/move-or-rename-drive-file.dto';
import { UpdateDriveFolderDto } from '@/modules/drive/dto/update-drive-folder.dto';
import { UploadDriveFileDto } from '@/modules/drive/dto/upload-drive-file.dto';
import { DriveService } from '@/modules/drive/drive.service';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

@ApiTags('Drive')
@ApiBearerAuth()
@RequiresModule('drive')
@Controller('businesses/:businessId/drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get(['folders', 'folders/:folderId'])
  @ApiOperation({
    summary: 'Lista subcarpetas y archivos (raiz si se omite folderId)',
  })
  listChildren(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('folderId') folderId: string | undefined,
    @Query() query: ListChildrenQueryDto,
  ) {
    return this.driveService.listChildren(
      businessId,
      req.user.id,
      query.scope,
      folderId,
    );
  }

  @Get('folders/:id/breadcrumb')
  @ApiOperation({ summary: 'Obtiene la cadena de carpetas ancestras' })
  getBreadcrumb(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.getBreadcrumb(businessId, req.user.id, id);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Crea una carpeta' })
  createFolder(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateDriveFolderDto,
  ) {
    return this.driveService.createFolder(
      businessId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: 'Renombra y/o mueve una carpeta' })
  updateFolder(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDriveFolderDto,
  ) {
    return this.driveService.updateFolder(
      businessId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Elimina (papelera en cascada) una carpeta' })
  deleteFolder(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.deleteFolder(
      businessId,
      req.user.id,
      req.user.role,
      id,
    );
  }

  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiOperation({ summary: 'Sube un archivo al Drive' })
  uploadFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UploadDriveFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.driveService.uploadFile(
      businessId,
      req.user.id,
      req.user.role,
      dto.scope,
      dto.folderId,
      file,
    );
  }

  @Get('files')
  @ApiOperation({ summary: 'Lista archivos recientes o en papelera' })
  listFiles(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: ListDriveFilesQueryDto,
  ) {
    return this.driveService.listFiles(businessId, req.user.id, query.scope, {
      trashed: query.trashed,
      recent: query.recent,
    });
  }

  @Get('files/:id/preview-url')
  @ApiOperation({
    summary: 'Obtiene una URL firmada para previsualizar el archivo',
  })
  getPreviewUrl(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.getFilePreviewUrl(businessId, req.user.id, id);
  }

  @Get('files/:id/download')
  @ApiOperation({ summary: 'Redirige a la URL firmada de descarga' })
  async downloadFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const url = await this.driveService.getFileDownloadUrl(
      businessId,
      req.user.id,
      id,
    );
    return res.redirect(url);
  }

  @Patch('files/:id')
  @ApiOperation({ summary: 'Renombra y/o mueve un archivo de carpeta' })
  moveOrRenameFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
    @Body() dto: MoveOrRenameDriveFileDto,
  ) {
    return this.driveService.moveOrRenameFile(
      businessId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Mueve un archivo a la papelera' })
  deleteFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.deleteFile(
      businessId,
      req.user.id,
      req.user.role,
      id,
    );
  }

  @Post('files/:id/restore')
  @ApiOperation({ summary: 'Restaura un archivo de la papelera' })
  restoreFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.restoreFile(
      businessId,
      req.user.id,
      req.user.role,
      id,
    );
  }

  @Delete('files/:id/permanent')
  @ApiOperation({ summary: 'Elimina un archivo definitivamente' })
  permanentlyDeleteFile(
    @Req() req: RequestWithUser,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id') id: string,
  ) {
    return this.driveService.permanentlyDeleteFile(
      businessId,
      req.user.id,
      req.user.role,
      id,
    );
  }
}
