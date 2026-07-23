import { join } from 'path';

export const ALLOWED_COVER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const COVER_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export const COVER_UPLOAD_DIR = join(process.cwd(), 'uploads', 'covers');
export const COVER_UPLOAD_URL_SEGMENT = '/uploads/covers/';
