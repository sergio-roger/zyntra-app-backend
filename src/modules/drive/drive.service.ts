import { Business } from '@auth/entities/business.entity';
import { User } from '@auth/entities/user.entity';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '@crm/enums/user-role.enum';
import { Repository } from 'typeorm';
import { CreateDriveFolderDto } from '@/modules/drive/dto/create-drive-folder.dto';
import { MoveOrRenameDriveFileDto } from '@/modules/drive/dto/move-or-rename-drive-file.dto';
import { UpdateDriveFolderDto } from '@/modules/drive/dto/update-drive-folder.dto';
import { DriveScope } from '@/modules/drive/enums/drive-scope.enum';
import { DriveFolderChildrenResult } from '@/modules/drive/interfaces/drive-folder-children-result.interface';
import { DriveOwner } from '@/modules/drive/interfaces/drive-owner.interface';
import { OwnerType } from '@/storage-client/enums/owner-type.enum';
import { BreadcrumbItem } from '@/storage-client/interfaces/breadcrumb-item.interface';
import { StorageFileRecord } from '@/storage-client/interfaces/storage-file-record.interface';
import { StorageFileResponse } from '@/storage-client/interfaces/storage-file-response.interface';
import { StorageFolder } from '@/storage-client/interfaces/storage-folder.interface';
import { StorageClientService } from '@/storage-client/storage-client.service';

const ROOT_FOLDER_NAME = 'Raiz';
const COMPANY_MUTATION_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SUPER_ADMIN,
];

@Injectable()
export class DriveService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly storageClient: StorageClientService,
  ) {}

  async listChildren(
    businessId: string,
    userId: string,
    scope: DriveScope,
    folderId?: string,
  ): Promise<DriveFolderChildrenResult> {
    const owner = this.resolveOwner(businessId, userId, scope);
    const parentId =
      folderId ?? (await this.resolveRootFolderId(businessId, userId, scope));
    const children = await this.storageClient.listFolderChildren(
      businessId,
      owner.ownerType,
      owner.ownerId,
      parentId,
    );
    return { folderId: parentId, ...children };
  }

  async createFolder(
    businessId: string,
    userId: string,
    role: UserRole,
    dto: CreateDriveFolderDto,
  ): Promise<StorageFolder> {
    this.assertScopeMutationAllowed(dto.scope, role);
    const owner = this.resolveOwner(businessId, userId, dto.scope);
    const parentId =
      dto.parentId ??
      (await this.resolveRootFolderId(businessId, userId, dto.scope));
    return this.storageClient.createFolder(businessId, {
      name: dto.name,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      parentId,
    });
  }

  async getBreadcrumb(
    businessId: string,
    userId: string,
    folderId: string,
  ): Promise<BreadcrumbItem[]> {
    const folder = await this.storageClient.getFolder(businessId, folderId);
    this.assertReadAccess(folder, userId);
    return this.storageClient.getFolderBreadcrumb(businessId, folderId);
  }

  async updateFolder(
    businessId: string,
    userId: string,
    role: UserRole,
    folderId: string,
    dto: UpdateDriveFolderDto,
  ): Promise<StorageFolder> {
    const folder = await this.storageClient.getFolder(businessId, folderId);
    this.assertMutationAccess(folder, userId, role);
    return this.storageClient.updateFolder(businessId, folderId, dto);
  }

  async deleteFolder(
    businessId: string,
    userId: string,
    role: UserRole,
    folderId: string,
  ): Promise<void> {
    const folder = await this.storageClient.getFolder(businessId, folderId);
    this.assertMutationAccess(folder, userId, role);
    return this.storageClient.deleteFolder(businessId, folderId);
  }

  async uploadFile(
    businessId: string,
    userId: string,
    role: UserRole,
    scope: DriveScope,
    folderId: string | undefined,
    file: Express.Multer.File,
  ): Promise<StorageFileResponse> {
    this.assertScopeMutationAllowed(scope, role);
    const owner = this.resolveOwner(businessId, userId, scope);
    const resolvedFolderId =
      folderId ?? (await this.resolveRootFolderId(businessId, userId, scope));
    return this.storageClient.uploadFile(
      businessId,
      file,
      `drive/${owner.ownerType}`,
      owner.ownerId,
      {
        folderId: resolvedFolderId,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
      },
    );
  }

  listFiles(
    businessId: string,
    userId: string,
    scope: DriveScope,
    options: { trashed?: boolean; recent?: boolean },
  ): Promise<StorageFileRecord[]> {
    const owner = this.resolveOwner(businessId, userId, scope);
    return this.storageClient.listFiles(
      businessId,
      owner.ownerType,
      owner.ownerId,
      options,
    );
  }

  async moveOrRenameFile(
    businessId: string,
    userId: string,
    role: UserRole,
    fileId: string,
    dto: MoveOrRenameDriveFileDto,
  ): Promise<StorageFileRecord> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertMutationAccess(file, userId, role);
    return this.storageClient.moveOrRenameFile(businessId, fileId, dto);
  }

  async deleteFile(
    businessId: string,
    userId: string,
    role: UserRole,
    fileId: string,
  ): Promise<void> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertMutationAccess(file, userId, role);
    return this.storageClient.deleteFile(businessId, fileId);
  }

  async restoreFile(
    businessId: string,
    userId: string,
    role: UserRole,
    fileId: string,
  ): Promise<StorageFileRecord> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertMutationAccess(file, userId, role);
    return this.storageClient.restoreFile(businessId, fileId);
  }

  async permanentlyDeleteFile(
    businessId: string,
    userId: string,
    role: UserRole,
    fileId: string,
  ): Promise<void> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertMutationAccess(file, userId, role);
    return this.storageClient.permanentlyDeleteFile(businessId, fileId);
  }

  async getFilePreviewUrl(
    businessId: string,
    userId: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertReadAccess(file, userId);
    return this.storageClient.getSignedUrl(businessId, fileId);
  }

  async getFileDownloadUrl(
    businessId: string,
    userId: string,
    fileId: string,
  ): Promise<string> {
    const file = await this.storageClient.getFile(businessId, fileId);
    this.assertReadAccess(file, userId);
    return this.storageClient.getDownloadUrl(businessId, fileId);
  }

  private resolveOwner(
    businessId: string,
    userId: string,
    scope: DriveScope,
  ): DriveOwner {
    return scope === DriveScope.COMPANY
      ? { ownerType: OwnerType.BUSINESS, ownerId: businessId }
      : { ownerType: OwnerType.USER, ownerId: userId };
  }

  private resolveRootFolderId(
    businessId: string,
    userId: string,
    scope: DriveScope,
  ): Promise<string> {
    if (scope === DriveScope.COMPANY) {
      return this.getOrCreateRoot(
        this.businessRepo,
        businessId,
        businessId,
        OwnerType.BUSINESS,
        businessId,
      );
    }
    return this.getOrCreateRoot(
      this.userRepo,
      userId,
      businessId,
      OwnerType.USER,
      userId,
    );
  }

  private async getOrCreateRoot(
    repo: Repository<{ id: string; driveRootFolderId: string | null }>,
    entityId: string,
    businessId: string,
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<string> {
    const entity = await repo.findOneBy({ id: entityId } as never);
    if (entity?.driveRootFolderId) return entity.driveRootFolderId;
    const folder = await this.storageClient.createFolder(businessId, {
      name: ROOT_FOLDER_NAME,
      ownerType,
      ownerId,
      parentId: null,
    });
    await repo.update(
      { id: entityId } as never,
      {
        driveRootFolderId: folder.id,
      } as never,
    );
    return folder.id;
  }

  private assertScopeMutationAllowed(scope: DriveScope, role: UserRole): void {
    if (
      scope === DriveScope.COMPANY &&
      !COMPANY_MUTATION_ROLES.includes(role)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar el Drive de la empresa',
      );
    }
  }

  private assertReadAccess(
    target: { ownerType: OwnerType | null; ownerId: string | null },
    userId: string,
  ): void {
    if (target.ownerType === OwnerType.USER && target.ownerId !== userId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }

  private assertMutationAccess(
    target: { ownerType: OwnerType | null; ownerId: string | null },
    userId: string,
    role: UserRole,
  ): void {
    if (target.ownerType === OwnerType.USER) {
      this.assertReadAccess(target, userId);
      return;
    }
    if (!COMPANY_MUTATION_ROLES.includes(role)) {
      throw new ForbiddenException(
        'No tienes permisos para modificar el Drive de la empresa',
      );
    }
  }
}
