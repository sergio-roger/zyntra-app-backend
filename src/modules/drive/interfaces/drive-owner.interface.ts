import { OwnerType } from '@/storage-client/enums/owner-type.enum';

export interface DriveOwner {
  ownerId: string;
  ownerType: OwnerType;
}
