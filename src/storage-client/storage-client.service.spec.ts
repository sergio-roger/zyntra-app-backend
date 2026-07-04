/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StorageClientService } from './storage-client.service';

describe('StorageClientService', () => {
  let service: StorageClientService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const httpMock = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_SERVICE_URL') return 'http://localhost:3100';
        if (key === 'STORAGE_SERVICE_TOKEN') return 'test-token';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageClientService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<StorageClientService>(StorageClientService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const fileMock = {
      buffer: Buffer.from('test'),
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 4,
    } as Express.Multer.File;

    it('should successfully upload a file', async () => {
      const responseData = {
        id: 'file-uuid-1',
        original_name: 'test.png',
        size: 4,
        mime_type: 'image/png',
        created_at: new Date().toISOString(),
      };

      httpService.post.mockReturnValue(of({ data: responseData } as any));

      const result = await service.uploadFile(
        'company-1',
        fileMock,
        'users',
        'user-1',
      );

      expect(result).toEqual(responseData);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3100/storage/upload',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-service-token': 'test-token',
            'x-company-id': 'company-1',
          }),
        }),
      );
    });

    it('should propagate 400 Bad Request error from storage-service', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'El archivo excede el tamaño máximo permitido' },
        },
      };

      httpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.uploadFile('company-1', fileMock, 'users', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException when storage-service is down', async () => {
      const networkError = new Error('ECONNREFUSED');

      httpService.post.mockReturnValue(throwError(() => networkError));

      await expect(
        service.uploadFile('company-1', fileMock, 'users', 'user-1'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getSignedUrl', () => {
    it('should successfully retrieve a signed URL', async () => {
      httpService.get.mockReturnValue(
        of({ data: { url: 'http://signed-url-here.com' } } as any),
      );

      const result = await service.getSignedUrl('company-1', 'file-uuid-1');

      expect(result).toBe('http://signed-url-here.com');
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3100/storage/files/file-uuid-1/signed-url',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-service-token': 'test-token',
            'x-company-id': 'company-1',
          }),
        }),
      );
    });

    it('should propagate 404 NotFoundException if file does not exist', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          status: 404,
        },
      };

      httpService.get.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.getSignedUrl('company-1', 'file-uuid-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('should call delete on storage-service and return void', async () => {
      httpService.delete.mockReturnValue(of({} as any));

      await expect(
        service.deleteFile('company-1', 'file-uuid-1'),
      ).resolves.toBeUndefined();
      expect(httpService.delete).toHaveBeenCalledWith(
        'http://localhost:3100/storage/files/file-uuid-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-service-token': 'test-token',
            'x-company-id': 'company-1',
          }),
        }),
      );
    });

    it('should be idempotent and ignore 404 errors', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          status: 404,
        },
      };

      httpService.delete.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.deleteFile('company-1', 'file-uuid-nonexistent'),
      ).resolves.toBeUndefined();
    });
  });
});
