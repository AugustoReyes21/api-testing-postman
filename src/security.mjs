import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const newSecret = () => randomBytes(24).toString('base64url');
export const passwordHash = (password, salt) => scryptSync(password, salt, 64).toString('hex');
export function checkPassword(password, salt, expected) {
  return timingSafeEqual(Buffer.from(passwordHash(password, salt), 'hex'), Buffer.from(expected, 'hex'));
}
