/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Business } from '@auth/entities/business.entity';
import { User } from '@auth/entities/user.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';
import { DriveService } from '@/modules/drive/drive.service';
import { OwnerType } from '@/storage-client/enums/owner-type.enum';
import { StorageClientService } from '@/storage-client/storage-client.service';

describe('DriveService', () => {
  let service: DriveService;
  let storageClient: jest.Mocked<
    Pick<
      StorageClientService,
      | 'createFolder'
      | 'getFolder'
      | 'getFolderBreadcrumb'
      | 'updateFolder'
      | 'deleteFolder'
      | 'listFolderChildren'
      | 'uploadFile'
      | 'listFiles'
      | 'getFile'
      | 'moveOrRenameFile'
      | 'deleteFile'
      | 'restoreFile'
      | 'permanentlyDeleteFile'
      | 'getSignedUrl'
      | 'getDownloadUrl'
    >
  >;
  let businessRepo: { findOneBy: jest.Mock; update: jest.Mock };
  let userRepo: { findOneBy: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    storageClient = {
      createFolder: jest.fn(),
      getFolder: jest.fn(),
      getFolderBreadcrumb: jest.fn(),
      updateFolder: jest.fn(),
      deleteFolder: jest.fn(),
      listFolderChildren: jest.fn(),
      uploadFile: jest.fn(),
      listFiles: jest.fn(),
      getFile: jest.fn(),
      moveOrRenameFile: jest.fn(),
      deleteFile: jest.fn(),
      restoreFile: jest.fn(),
      permanentlyDeleteFile: jest.fn(),
      getSignedUrl: jest.fn(),
      getDownloadUrl: jest.fn(),
    } as any;
    businessRepo = { findOneBy: jest.fn(), update: jest.fn() };
    userRepo = { findOneBy: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriveService,
        { provide: StorageClientService, useValue: storageClient },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<DriveService>(DriveService);
  });

  describe('resolveRootFolderId (via listChildren)', () => {
    it('reuses an existing root folder id without creating a new one', async () => {
      userRepo.findOneBy.mockResolvedValue({ driveRootFolderId: 'root-1' });
      storageClient.listFolderChildren!.mockResolvedValue({
        folders: [],
        files: [],
      });

      await service.listChildren('biz-1', 'user-1', DriveScope.ME);

      expect(storageClient.createFolder).not.toHaveBeenCalled();
      expect(storageClient.listFolderChildren).toHaveBeenCalledWith(
        'biz-1',
        OwnerType.USER,
        'user-1',
        'root-1',
      );
    });

    it('lazily creates and persists a root folder when missing', async () => {
      userRepo.findOneBy.mockResolvedValue({ driveRootFolderId: null });
      storageClient.createFolder!.mockResolvedValue({ id: 'new-root' } as any);
      storageClient.listFolderChildren!.mockResolvedValue({
        folders: [],
        files: [],
      });

      await service.listChildren('biz-1', 'user-1', DriveScope.ME);

      expect(storageClient.createFolder).toHaveBeenCalledWith('biz-1', {
        name: 'Raiz',
        ownerType: OwnerType.USER,
        ownerId: 'user-1',
        parentId: null,
      });
      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'user-1' },
        { driveRootFolderId: 'new-root' },
      );
    });

    it('creates the company root against the business repository', async () => {
      businessRepo.findOneBy.mockResolvedValue({ driveRootFolderId: null });
      storageClient.createFolder!.mockResolvedValue({ id: 'biz-root' } as any);
      storageClient.listFolderChildren!.mockResolvedValue({
        folders: [],
        files: [],
      });

      await service.listChildren('biz-1', 'user-1', DriveScope.COMPANY);

      expect(storageClient.createFolder).toHaveBeenCalledWith('biz-1', {
        name: 'Raiz',
        ownerType: OwnerType.BUSINESS,
        ownerId: 'biz-1',
        parentId: null,
      });
      expect(businessRepo.update).toHaveBeenCalledWith(
        { id: 'biz-1' },
        { driveRootFolderId: 'biz-root' },
      );
    });
  });

  describe('createFolder authorization', () => {
    it('rejects a non-privileged role creating a company-scope folder', async () => {
      await expect(
        service.createFolder('biz-1', 'user-1', UserRole.AGENT, {
          scope: DriveScope.COMPANY,
          name: 'Nueva',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(storageClient.createFolder).not.toHaveBeenCalled();
    });

    it('allows an admin to create a company-scope folder', async () => {
      businessRepo.findOneBy.mockResolvedValue({ driveRootFolderId: 'root-1' });
      storageClient.createFolder!.mockResolvedValue({ id: 'folder-1' } as any);

      await service.createFolder('biz-1', 'user-1', UserRole.ADMIN, {
        scope: DriveScope.COMPANY,
        name: 'Nueva',
      });

      expect(storageClient.createFolder).toHaveBeenCalled();
    });

    it('allows any authenticated role to create in their own personal scope', async () => {
      userRepo.findOneBy.mockResolvedValue({ driveRootFolderId: 'root-1' });
      storageClient.createFolder!.mockResolvedValue({ id: 'folder-1' } as any);

      await service.createFolder('biz-1', 'user-1', UserRole.AGENT, {
        scope: DriveScope.ME,
        name: 'Nueva',
      });

      expect(storageClient.createFolder).toHaveBeenCalled();
    });
  });

  describe('mutation access on existing folders', () => {
    it('blocks a user from deleting another user personal folder', async () => {
      storageClient.getFolder!.mockResolvedValue({
        ownerType: OwnerType.USER,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.deleteFolder('biz-1', 'user-1', UserRole.ADMIN, 'folder-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(storageClient.deleteFolder).not.toHaveBeenCalled();
    });

    it('allows the owner to delete their own personal folder', async () => {
      storageClient.getFolder!.mockResolvedValue({
        ownerType: OwnerType.USER,
        ownerId: 'user-1',
      } as any);

      await service.deleteFolder('biz-1', 'user-1', UserRole.AGENT, 'folder-1');

      expect(storageClient.deleteFolder).toHaveBeenCalledWith(
        'biz-1',
        'folder-1',
      );
    });

    it('blocks a non-privileged role from deleting a company folder', async () => {
      storageClient.getFolder!.mockResolvedValue({
        ownerType: OwnerType.BUSINESS,
        ownerId: 'biz-1',
      } as any);

      await expect(
        service.deleteFolder('biz-1', 'user-1', UserRole.AGENT, 'folder-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('mutation access on existing files', () => {
    it('blocks a user from restoring another user file', async () => {
      storageClient.getFile!.mockResolvedValue({
        ownerType: OwnerType.USER,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.restoreFile('biz-1', 'user-1', UserRole.ADMIN, 'file-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a manager to permanently delete a company file', async () => {
      storageClient.getFile!.mockResolvedValue({
        ownerType: OwnerType.BUSINESS,
        ownerId: 'biz-1',
      } as any);

      await service.permanentlyDeleteFile(
        'biz-1',
        'user-1',
        UserRole.MANAGER,
        'file-1',
      );

      expect(storageClient.permanentlyDeleteFile).toHaveBeenCalledWith(
        'biz-1',
        'file-1',
      );
    });
  });

  describe('read access', () => {
    it('blocks reading the breadcrumb of another user personal folder', async () => {
      storageClient.getFolder!.mockResolvedValue({
        ownerType: OwnerType.USER,
        ownerId: 'other-user',
      } as any);

      await expect(
        service.getBreadcrumb('biz-1', 'user-1', 'folder-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(storageClient.getFolderBreadcrumb).not.toHaveBeenCalled();
    });

    it('allows reading the preview url of a company file for any authenticated user', async () => {
      storageClient.getFile!.mockResolvedValue({
        ownerType: OwnerType.BUSINESS,
        ownerId: 'biz-1',
      } as any);
      storageClient.getSignedUrl!.mockResolvedValue('https://signed');

      const url = await service.getFilePreviewUrl('biz-1', 'user-1', 'file-1');

      expect(url).toBe('https://signed');
    });
  });
});
