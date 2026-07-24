import { OwnerType } from '@/storage-client/enums/owner-type.enum';

export interface CreateFolderRequest {
  name: string;
  ownerId: string;
  ownerType: OwnerType;
  parentId?: string | null;
}
