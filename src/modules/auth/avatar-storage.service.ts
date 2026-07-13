import {
  AVATAR_MIME_EXTENSIONS,
  AVATAR_UPLOAD_DIR,
  AVATAR_UPLOAD_URL_SEGMENT,
} from '@auth/constants/avatar-storage.constants';
import { UploadableFile } from '@auth/interfaces/uploadable-file.interface';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class AvatarStorageService {
  private get baseUrl(): string {
    return process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';
  }

  async save(file: UploadableFile): Promise<string> {
    await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
    const extension = AVATAR_MIME_EXTENSIONS[file.mimetype] || '';
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(join(AVATAR_UPLOAD_DIR, filename), file.buffer);
    return `${this.baseUrl}${AVATAR_UPLOAD_URL_SEGMENT}${filename}`;
  }

  async delete(avatarUrl: string): Promise<void> {
    const [, filename] = avatarUrl.split(AVATAR_UPLOAD_URL_SEGMENT);
    if (!filename) return;
    await fs.unlink(join(AVATAR_UPLOAD_DIR, filename)).catch(() => undefined);
  }
}
