import * as argon2 from 'argon2';

function getArgonOptions() {
  return {
    secret: Buffer.from(
      process.env.ARGON2_PEPPER || 'default-pepper-key-for-fallback-planchat',
    ),
  };
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, getArgonOptions());
}

export function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password, getArgonOptions());
}
