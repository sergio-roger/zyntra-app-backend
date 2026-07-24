import { OwnerType } from '@/storage-client/enums/owner-type.enum';

export interface StorageFileRecord {
  bucket: string;
  checksum: string | null;
  companyId: string;
  createdAt: string;
  deletedAt: string | null;
  entityId: string;
  extension: string;
  folderId: string | null;
  id: string;
  isStarred: boolean;
  mimeType: string;
  module: string;
  objectKey: string;
  originalName: string;
  ownerId: string | null;
  ownerType: OwnerType | null;
  size: number;
  storedName: string;
  updatedAt: string;
}
