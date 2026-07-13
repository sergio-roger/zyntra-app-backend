import { join } from 'path';

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export const AVATAR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
export const AVATAR_UPLOAD_URL_SEGMENT = '/uploads/avatars/';
