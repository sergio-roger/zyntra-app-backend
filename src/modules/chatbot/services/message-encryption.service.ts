import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { CRYPTO_ALGORITHM } from '@/modules/channels/constants/crypto.constants';

/**
 * Encrypts message content at rest. Uses its own key (MESSAGE_ENCRYPTION_KEY)
 * separate from CHANNEL_CREDENTIALS_KEY — messages and channel credentials
 * are different data domains and must not share a key, so rotating/leaking
 * one never affects the other.
 */
@Injectable()
export class MessageEncryptionService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.MESSAGE_ENCRYPTION_KEY;
    if (!raw) throw new Error('MESSAGE_ENCRYPTION_KEY env var not set');
    this.key = Buffer.from(raw, 'hex');
    if (this.key.length !== 32) {
      throw new Error(
        'MESSAGE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)',
      );
    }
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(encoded: string): string {
    const [ivHex, tagHex, ctHex] = encoded.split(':');
    if (!ivHex || !tagHex || !ctHex) {
      throw new Error('Invalid encrypted message format');
    }
    const decipher = crypto.createDecipheriv(
      CRYPTO_ALGORITHM,
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ctHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
