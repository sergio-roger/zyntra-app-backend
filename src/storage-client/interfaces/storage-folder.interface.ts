import { OwnerType } from '@/storage-client/enums/owner-type.enum';

export interface StorageFolder {
  companyId: string;
  createdAt: string;
  id: string;
  isStarred: boolean;
  name: string;
  ownerId: string;
  ownerType: OwnerType;
  parentId: string | null;
  path: string;
  updatedAt: string;
}
