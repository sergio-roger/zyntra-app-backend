import { OwnerType } from '@/storage-client/enums/owner-type.enum';

export interface UploadDriveMeta {
  folderId?: string;
  ownerId?: string;
  ownerType?: OwnerType;
  businessFriendlyKey?: string;
  ownerFriendlyKey?: string;
}
