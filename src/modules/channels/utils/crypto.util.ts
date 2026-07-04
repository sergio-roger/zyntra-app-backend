import * as crypto from 'crypto';
import { CRYPTO_ALGORITHM } from '@/modules/channels/constants/crypto.constants';

function getKey(): Buffer {
  const raw = process.env.CHANNEL_CREDENTIALS_KEY;
  if (!raw) throw new Error('CHANNEL_CREDENTIALS_KEY env var not set');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32)
    throw new Error('CHANNEL_CREDENTIALS_KEY must be 32 bytes (64 hex chars)');
  return key;
}

export function encryptCredentials(data: Record<string, unknown>): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, key, iv);
  const plain = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(encoded: string): Record<string, unknown> {
  const key = getKey();
  const [ivHex, tagHex, ctHex] = encoded.split(':');
  if (!ivHex || !tagHex || !ctHex) throw new Error('Invalid credential format');
  const decipher = crypto.createDecipheriv(
    CRYPTO_ALGORITHM,
    key,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
}
