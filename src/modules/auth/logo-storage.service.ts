import {
  LOGO_MIME_EXTENSIONS,
  LOGO_UPLOAD_DIR,
  LOGO_UPLOAD_URL_SEGMENT,
} from '@auth/constants/logo-storage.constants';
import type { UploadableFile } from '@auth/interfaces/uploadable-file.interface';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class LogoStorageService {
  private get baseUrl(): string {
    return process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';
  }

  async save(file: UploadableFile): Promise<string> {
    await fs.mkdir(LOGO_UPLOAD_DIR, { recursive: true });
    const extension = LOGO_MIME_EXTENSIONS[file.mimetype] || '';
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(join(LOGO_UPLOAD_DIR, filename), file.buffer);
    return `${this.baseUrl}${LOGO_UPLOAD_URL_SEGMENT}${filename}`;
  }

  async delete(logoUrl: string): Promise<void> {
    const [, filename] = logoUrl.split(LOGO_UPLOAD_URL_SEGMENT);
    if (!filename) return;
    await fs.unlink(join(LOGO_UPLOAD_DIR, filename)).catch(() => undefined);
  }
}
