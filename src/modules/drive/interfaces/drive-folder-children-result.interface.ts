import { StorageFileRecord } from '@/storage-client/interfaces/storage-file-record.interface';
import { StorageFolder } from '@/storage-client/interfaces/storage-folder.interface';

export interface DriveFolderChildrenResult {
  folderId: string;
  folders: StorageFolder[];
  files: StorageFileRecord[];
}
