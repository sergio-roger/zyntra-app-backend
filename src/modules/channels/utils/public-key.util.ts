import * as crypto from 'crypto';

const PUBLIC_KEY_PREFIX = 'wpk_';
const RANDOM_PART_LENGTH = 21;

/** Generates a public, non-secret channel identifier (wpk_ + 21 url-safe chars). */
export function generatePublicKey(): string {
  const random = crypto
    .randomBytes(16)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, RANDOM_PART_LENGTH);
  return `${PUBLIC_KEY_PREFIX}${random}`;
}
