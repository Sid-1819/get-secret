import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH_BYTES = 32;

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  if (trimmed.length === 44 && /^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
    return Buffer.from(trimmed, 'base64');
  }
  throw new Error(
    'ENCRYPTION_KEY must be 32 bytes: 64 hex chars or 44 base64 chars',
  );
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key: Buffer;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw?.trim()) {
      throw new Error('ENCRYPTION_KEY is required');
    }
    this.key = parseKey(raw);
    if (this.key.length !== KEY_LENGTH_BYTES) {
      throw new Error(
        `ENCRYPTION_KEY must be ${KEY_LENGTH_BYTES} bytes (got ${this.key.length})`,
      );
    }
  }

  onModuleInit(): void {
    // Key already validated in constructor
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, encrypted, authTag]);
    return payload.toString('base64');
  }

  decrypt(payload: string): string {
    return this.decryptToBytes(payload).toString('utf8');
  }

  /** AES-256-GCM encrypt arbitrary bytes (server-side path for attachments). */
  encryptBytes(plaintext: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, encrypted, authTag]);
    return payload.toString('base64');
  }

  decryptToBytes(payload: string): Buffer {
    const buf = Buffer.from(payload, 'base64');
    if (
      buf.length < IV_LENGTH + AUTH_TAG_LENGTH ||
      buf.length > 1024 * 1024 * 4
    ) {
      throw new Error('Invalid encryption payload');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      Buffer.from(decipher.update(ciphertext)),
      Buffer.from(decipher.final()),
    ]);
  }
}
