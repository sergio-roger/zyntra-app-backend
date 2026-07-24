import { OwnerType } from '@/storage-client/enums/owner-type.enum';
import { BreadcrumbItem } from '@/storage-client/interfaces/breadcrumb-item.interface';
import { CreateFolderRequest } from '@/storage-client/interfaces/create-folder-request.interface';
import { FolderChildrenResponse } from '@/storage-client/interfaces/folder-children-response.interface';
import { MoveOrRenameFileRequest } from '@/storage-client/interfaces/move-or-rename-file-request.interface';
import { StorageFileRecord } from '@/storage-client/interfaces/storage-file-record.interface';
import { StorageFileResponse } from '@/storage-client/interfaces/storage-file-response.interface';
import { StorageFolder } from '@/storage-client/interfaces/storage-folder.interface';
import { StorageUploadResponseDto } from '@/storage-client/interfaces/storage-upload-response.interface';
import { UpdateFolderRequest } from '@/storage-client/interfaces/update-folder-request.interface';
import { UploadDriveMeta } from '@/storage-client/interfaces/upload-drive-meta.interface';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class StorageClientService {
  private readonly logger = new Logger(StorageClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return (
      this.configService.get<string>('STORAGE_SERVICE_URL') || 'localhost:3000'
    );
  }

  private buildHeaders(
    companyId: string,
    extraHeaders: Record<string, string> = {},
  ): Record<string, string> {
    const token = this.configService.get<string>('STORAGE_SERVICE_TOKEN') || '';
    return {
      'x-service-token': token,
      'x-company-id': companyId,
      ...extraHeaders,
    };
  }

  async uploadFile(
    companyId: string,
    file: Express.Multer.File,
    moduleName: string,
    entityId: string,
    driveMeta?: UploadDriveMeta,
  ): Promise<StorageFileResponse> {
    const form = this.buildUploadForm(
      file,
      companyId,
      moduleName,
      entityId,
      driveMeta,
    );
    const url = `${this.baseUrl}/storage/upload`;
    const headers = this.buildHeaders(companyId, form.getHeaders());

    try {
      const response = await firstValueFrom(
        this.httpService.post<StorageUploadResponseDto>(url, form, { headers }),
      );
      return this.mapUploadResponse(response.data);
    } catch (error: unknown) {
      this.logStorageError('uploading file to storage service', error);
      throw this.mapBadRequestOrUnavailable(error);
    }
  }

  async getSignedUrl(companyId: string, fileId: string): Promise<string> {
    const url = `${this.baseUrl}/storage/files/${fileId}/signed-url`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ url: string }>(url, { headers }),
      );
      return response.data.url;
    } catch (error: unknown) {
      this.logStorageError('getting signed URL', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Archivo no encontrado en el servicio de almacenamiento',
      );
    }
  }

  getDownloadUrl(companyId: string, fileId: string): string {
    return `${this.baseUrl}/storage/download/${fileId}`;
  }

  async deleteFile(companyId: string, fileId: string): Promise<void> {
    const url = `${this.baseUrl}/storage/files/${fileId}`;
    const headers = this.buildHeaders(companyId);

    try {
      await firstValueFrom(this.httpService.delete(url, { headers }));
    } catch (error: unknown) {
      this.logStorageError('deleting file', error);
      if (this.getAxiosStatus(error) === 404) {
        return;
      }
      throw this.serviceUnavailable();
    }
  }

  async getFile(companyId: string, fileId: string): Promise<StorageFileRecord> {
    const url = `${this.baseUrl}/storage/files/${fileId}`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.get<StorageFileRecord>(url, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('getting file record', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Archivo no encontrado en el servicio de almacenamiento',
      );
    }
  }

  async listFiles(
    companyId: string,
    ownerType: OwnerType,
    ownerId: string,
    options: { trashed?: boolean; recent?: boolean } = {},
  ): Promise<StorageFileRecord[]> {
    const url = `${this.baseUrl}/storage/files`;
    const headers = this.buildHeaders(companyId);
    const params = { ownerType, ownerId, ...options };

    try {
      const response = await firstValueFrom(
        this.httpService.get<StorageFileRecord[]>(url, { headers, params }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('listing files', error);
      throw this.serviceUnavailable();
    }
  }

  async moveOrRenameFile(
    companyId: string,
    fileId: string,
    request: MoveOrRenameFileRequest,
  ): Promise<StorageFileRecord> {
    const url = `${this.baseUrl}/storage/files/${fileId}`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.patch<StorageFileRecord>(url, request, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('moving or renaming file', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Archivo no encontrado en el servicio de almacenamiento',
      );
    }
  }

  async restoreFile(
    companyId: string,
    fileId: string,
  ): Promise<StorageFileRecord> {
    const url = `${this.baseUrl}/storage/files/${fileId}/restore`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.post<StorageFileRecord>(url, {}, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('restoring file', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Archivo no encontrado en el servicio de almacenamiento',
      );
    }
  }

  async permanentlyDeleteFile(
    companyId: string,
    fileId: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/storage/files/${fileId}/permanent`;
    const headers = this.buildHeaders(companyId);

    try {
      await firstValueFrom(this.httpService.delete(url, { headers }));
    } catch (error: unknown) {
      this.logStorageError('permanently deleting file', error);
      if (this.getAxiosStatus(error) === 404) {
        return;
      }
      throw this.serviceUnavailable();
    }
  }

  async createFolder(
    companyId: string,
    request: CreateFolderRequest,
  ): Promise<StorageFolder> {
    const url = `${this.baseUrl}/storage/folders`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.post<StorageFolder>(url, request, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('creating folder', error);
      throw this.mapFolderMutationError(error);
    }
  }

  async getFolder(companyId: string, folderId: string): Promise<StorageFolder> {
    const url = `${this.baseUrl}/storage/folders/${folderId}`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.get<StorageFolder>(url, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('getting folder record', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Carpeta no encontrada en el servicio de almacenamiento',
      );
    }
  }

  async listFolderChildren(
    companyId: string,
    ownerType: OwnerType,
    ownerId: string,
    parentId: string,
  ): Promise<FolderChildrenResponse> {
    const url = `${this.baseUrl}/storage/folders/children`;
    const headers = this.buildHeaders(companyId);
    const params = { ownerType, ownerId, parentId };

    try {
      const response = await firstValueFrom(
        this.httpService.get<FolderChildrenResponse>(url, { headers, params }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('listing folder children', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Carpeta no encontrada en el servicio de almacenamiento',
      );
    }
  }

  async getFolderBreadcrumb(
    companyId: string,
    folderId: string,
  ): Promise<BreadcrumbItem[]> {
    const url = `${this.baseUrl}/storage/folders/${folderId}/breadcrumb`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.get<BreadcrumbItem[]>(url, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('getting folder breadcrumb', error);
      throw this.mapNotFoundOrUnavailable(
        error,
        'Carpeta no encontrada en el servicio de almacenamiento',
      );
    }
  }

  async updateFolder(
    companyId: string,
    folderId: string,
    request: UpdateFolderRequest,
  ): Promise<StorageFolder> {
    const url = `${this.baseUrl}/storage/folders/${folderId}`;
    const headers = this.buildHeaders(companyId);

    try {
      const response = await firstValueFrom(
        this.httpService.patch<StorageFolder>(url, request, { headers }),
      );
      return response.data;
    } catch (error: unknown) {
      this.logStorageError('updating folder', error);
      throw this.mapFolderMutationError(error);
    }
  }

  async deleteFolder(companyId: string, folderId: string): Promise<void> {
    const url = `${this.baseUrl}/storage/folders/${folderId}`;
    const headers = this.buildHeaders(companyId);

    try {
      await firstValueFrom(this.httpService.delete(url, { headers }));
    } catch (error: unknown) {
      this.logStorageError('deleting folder', error);
      if (this.getAxiosStatus(error) === 404) {
        return;
      }
      throw this.serviceUnavailable();
    }
  }

  private buildUploadForm(
    file: Express.Multer.File,
    companyId: string,
    moduleName: string,
    entityId: string,
    driveMeta?: UploadDriveMeta,
  ): FormData {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('businessId', companyId);
    form.append('module', moduleName);
    form.append('entityId', entityId);
    if (driveMeta?.folderId) form.append('folderId', driveMeta.folderId);
    if (driveMeta?.ownerType) form.append('ownerType', driveMeta.ownerType);
    if (driveMeta?.ownerId) form.append('ownerId', driveMeta.ownerId);
    if (driveMeta?.businessFriendlyKey) {
      form.append('businessFriendlyKey', driveMeta.businessFriendlyKey);
    }
    if (driveMeta?.ownerFriendlyKey) {
      form.append('ownerFriendlyKey', driveMeta.ownerFriendlyKey);
    }
    return form;
  }

  private mapUploadResponse(
    data: StorageUploadResponseDto,
  ): StorageFileResponse {
    return {
      id: data.id,
      originalName: data.original_name,
      size: data.size,
      mimeType: data.mime_type,
      createdAt: data.created_at,
    };
  }

  private mapBadRequestOrUnavailable(error: unknown): Error {
    if (this.getAxiosStatus(error) === 400) {
      return new BadRequestException(this.extractBadRequestMessage(error));
    }
    return this.serviceUnavailable();
  }

  private mapNotFoundOrUnavailable(
    error: unknown,
    notFoundMessage: string,
  ): Error {
    if (this.getAxiosStatus(error) === 404) {
      return new NotFoundException(notFoundMessage);
    }
    return this.serviceUnavailable();
  }

  private mapFolderMutationError(error: unknown): Error {
    const status = this.getAxiosStatus(error);
    if (status === 400) {
      return new BadRequestException(this.extractBadRequestMessage(error));
    }
    if (status === 404) {
      return new NotFoundException(
        'Carpeta no encontrada en el servicio de almacenamiento',
      );
    }
    return this.serviceUnavailable();
  }

  private extractBadRequestMessage(error: unknown): string {
    const data = axios.isAxiosError(error)
      ? (error.response?.data as Record<string, unknown> | undefined)
      : undefined;
    return data && typeof data.message === 'string'
      ? data.message
      : 'Validación fallida en el servicio de almacenamiento';
  }

  private getAxiosStatus(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
  }

  private serviceUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'El servicio de archivos no está disponible, intenta de nuevo en unos segundos',
    );
  }

  private logStorageError(action: string, error: unknown): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const msg = axios.isAxiosError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
    this.logger.error(`Error ${action}: ${msg}`, stack);
  }
}
