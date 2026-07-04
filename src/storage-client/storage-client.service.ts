import { StorageFileResponse } from '@/storage-client/interfaces/storage-file-response.interface';
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
  ): Promise<StorageFileResponse> {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('businessId', companyId);
    form.append('module', moduleName);
    form.append('entityId', entityId);

    const url = `${this.baseUrl}/storage/upload`;
    const headers = this.buildHeaders(companyId, form.getHeaders());

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          id: string;
          original_name: string;
          size: number;
          mime_type: string;
          created_at: string;
        }>(url, form, { headers }),
      );
      const data = response.data;
      return {
        id: data.id,
        originalName: data.original_name,
        size: data.size,
        mimeType: data.mime_type,
        createdAt: data.created_at,
      };
    } catch (error: unknown) {
      const isAxios = axios.isAxiosError(error);
      const msg = isAxios
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error uploading file to storage service: ${msg}`,
        stack,
      );
      if (isAxios && error.response) {
        const status = error.response.status;
        if (status === 400) {
          const data = error.response.data as
            | Record<string, unknown>
            | null
            | undefined;
          const errMsg =
            data && typeof data === 'object' && typeof data.message === 'string'
              ? data.message
              : 'Validación fallida en el servicio de almacenamiento';
          throw new BadRequestException(errMsg);
        }
      }
      throw new ServiceUnavailableException(
        'El servicio de archivos no está disponible, intenta de nuevo en unos segundos',
      );
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
      const isAxios = axios.isAxiosError(error);
      const msg = isAxios
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(`Error getting signed URL: ${msg}`);
      if (isAxios && error.response) {
        const { status } = error.response;
        if (status === 404) {
          throw new NotFoundException(
            'Archivo no encontrado en el servicio de almacenamiento',
          );
        }
      }
      throw new ServiceUnavailableException(
        'El servicio de archivos no está disponible, intenta de nuevo en unos segundos',
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
      const isAxios = axios.isAxiosError(error);
      const msg = isAxios
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(`Error deleting file: ${msg}`);
      if (isAxios && error.response) {
        const { status } = error.response;
        if (status === 404) {
          // Idempotent: 404 is ignored
          return;
        }
      }
      throw new ServiceUnavailableException(
        'El servicio de archivos no está disponible, intenta de nuevo en unos segundos',
      );
    }
  }
}
