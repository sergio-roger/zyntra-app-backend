import { join } from 'path';

export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const LOGO_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export const LOGO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'logos');
export const LOGO_UPLOAD_URL_SEGMENT = '/uploads/logos/';
