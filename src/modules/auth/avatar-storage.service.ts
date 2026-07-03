import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
const UPLOAD_URL_SEGMENT = '/uploads/avatars/';

export interface UploadableFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class AvatarStorageService {
  private get baseUrl(): string {
    return process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';
  }

  async save(file: UploadableFile): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const extension = MIME_EXTENSIONS[file.mimetype] || '';
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(join(UPLOAD_DIR, filename), file.buffer);
    return `${this.baseUrl}${UPLOAD_URL_SEGMENT}${filename}`;
  }

  async delete(avatarUrl: string): Promise<void> {
    const [, filename] = avatarUrl.split(UPLOAD_URL_SEGMENT);
    if (!filename) return;
    await fs.unlink(join(UPLOAD_DIR, filename)).catch(() => undefined);
  }
}
