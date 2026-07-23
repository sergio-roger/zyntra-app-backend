import {
  COVER_MIME_EXTENSIONS,
  COVER_UPLOAD_DIR,
  COVER_UPLOAD_URL_SEGMENT,
} from '@auth/constants/cover-storage.constants';
import type { UploadableFile } from '@auth/interfaces/uploadable-file.interface';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class CoverStorageService {
  private get baseUrl(): string {
    return process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';
  }

  async save(file: UploadableFile): Promise<string> {
    await fs.mkdir(COVER_UPLOAD_DIR, { recursive: true });
    const extension = COVER_MIME_EXTENSIONS[file.mimetype] || '';
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(join(COVER_UPLOAD_DIR, filename), file.buffer);
    return `${this.baseUrl}${COVER_UPLOAD_URL_SEGMENT}${filename}`;
  }

  async delete(coverUrl: string): Promise<void> {
    const [, filename] = coverUrl.split(COVER_UPLOAD_URL_SEGMENT);
    if (!filename) return;
    await fs.unlink(join(COVER_UPLOAD_DIR, filename)).catch(() => undefined);
  }
}
