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
import { OwnerType } from '@/storage-client/enums/owner-type.enum';
import { StorageClientService } from './storage-client.service';

describe('StorageClientService', () => {
  let service: StorageClientService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const httpMock = {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
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

      expect(result).toEqual({
        id: 'file-uuid-1',
        originalName: 'test.png',
        size: 4,
        mimeType: 'image/png',
        createdAt: responseData.created_at,
      });
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

  describe('createFolder', () => {
    const request = {
      name: 'Facturas',
      ownerType: OwnerType.USER,
      ownerId: 'user-1',
    };

    it('should create a folder', async () => {
      const folder = { id: 'folder-1', ...request };
      httpService.post.mockReturnValue(of({ data: folder } as any));

      const result = await service.createFolder('company-1', request);

      expect(result).toEqual(folder);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3100/storage/folders',
        request,
        expect.any(Object),
      );
    });

    it('should propagate 400 as BadRequestException (e.g. cyclic move)', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 400, data: { message: 'Movimiento invalido' } },
      };
      httpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(service.createFolder('company-1', request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate 404 as NotFoundException (missing parent)', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(service.createFolder('company-1', request)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFolder', () => {
    it('should return the folder record', async () => {
      const folder = { id: 'folder-1', ownerType: OwnerType.BUSINESS };
      httpService.get.mockReturnValue(of({ data: folder } as any));

      const result = await service.getFolder('company-1', 'folder-1');

      expect(result).toEqual(folder);
    });

    it('should throw NotFoundException when the folder does not exist', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.get.mockReturnValue(throwError(() => errorResponse));

      await expect(service.getFolder('company-1', 'folder-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listFolderChildren', () => {
    it('should list folders and files under a parent', async () => {
      const payload = { folders: [], files: [] };
      httpService.get.mockReturnValue(of({ data: payload } as any));

      const result = await service.listFolderChildren(
        'company-1',
        OwnerType.USER,
        'user-1',
        'root-1',
      );

      expect(result).toEqual(payload);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3100/storage/folders/children',
        expect.objectContaining({
          params: {
            ownerType: OwnerType.USER,
            ownerId: 'user-1',
            parentId: 'root-1',
          },
        }),
      );
    });
  });

  describe('updateFolder', () => {
    it('should rename/move a folder', async () => {
      const updated = { id: 'folder-1', name: 'Nuevo nombre' };
      httpService.patch.mockReturnValue(of({ data: updated } as any));

      const result = await service.updateFolder('company-1', 'folder-1', {
        name: 'Nuevo nombre',
      });

      expect(result).toEqual(updated);
    });

    it('should propagate 400 as BadRequestException', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 400, data: { message: 'ciclo invalido' } },
      };
      httpService.patch.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.updateFolder('company-1', 'folder-1', { parentId: 'child-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFolder', () => {
    it('should be idempotent and ignore 404 errors', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.delete.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.deleteFolder('company-1', 'folder-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getFile', () => {
    it('should return the file record', async () => {
      const record = { id: 'file-1', ownerType: OwnerType.USER };
      httpService.get.mockReturnValue(of({ data: record } as any));

      const result = await service.getFile('company-1', 'file-1');

      expect(result).toEqual(record);
    });

    it('should throw NotFoundException when the file does not exist', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.get.mockReturnValue(throwError(() => errorResponse));

      await expect(service.getFile('company-1', 'file-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listFiles', () => {
    it('should list files with the given owner scope and options', async () => {
      httpService.get.mockReturnValue(of({ data: [] } as any));

      await service.listFiles('company-1', OwnerType.USER, 'user-1', {
        trashed: true,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3100/storage/files',
        expect.objectContaining({
          params: {
            ownerType: OwnerType.USER,
            ownerId: 'user-1',
            trashed: true,
          },
        }),
      );
    });
  });

  describe('moveOrRenameFile', () => {
    it('should rename/move a file', async () => {
      const updated = { id: 'file-1', originalName: 'nuevo.png' };
      httpService.patch.mockReturnValue(of({ data: updated } as any));

      const result = await service.moveOrRenameFile('company-1', 'file-1', {
        originalName: 'nuevo.png',
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if file does not exist', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.patch.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.moveOrRenameFile('company-1', 'file-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreFile', () => {
    it('should restore a trashed file', async () => {
      const restored = { id: 'file-1', deletedAt: null };
      httpService.post.mockReturnValue(of({ data: restored } as any));

      const result = await service.restoreFile('company-1', 'file-1');

      expect(result).toEqual(restored);
    });
  });

  describe('permanentlyDeleteFile', () => {
    it('should be idempotent and ignore 404 errors', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: { status: 404 },
      };
      httpService.delete.mockReturnValue(throwError(() => errorResponse));

      await expect(
        service.permanentlyDeleteFile('company-1', 'file-1'),
      ).resolves.toBeUndefined();
    });
  });
});
