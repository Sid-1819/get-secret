import { randomBytes } from 'node:crypto';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const validKeyHex = '0'.repeat(64);
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = validKeyHex;
    service = new EncryptionService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt / decrypt round-trip', () => {
    it('returns original plaintext after encrypt and decrypt', () => {
      const plain = 'hello secret';
      const payload = service.encrypt(plain);
      expect(payload).not.toBe(plain);
      expect(payload).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(service.decrypt(payload)).toBe(plain);
    });

    it('produces different ciphertext each time (random IV)', () => {
      const plain = 'same';
      const a = service.encrypt(plain);
      const b = service.encrypt(plain);
      expect(a).not.toBe(b);
      expect(service.decrypt(a)).toBe(plain);
      expect(service.decrypt(b)).toBe(plain);
    });

    it('handles empty string and unicode', () => {
      expect(service.decrypt(service.encrypt(''))).toBe('');
      const unicode = 'café 日本語';
      expect(service.decrypt(service.encrypt(unicode))).toBe(unicode);
    });
  });

  describe('encryptBytes / decryptToBytes', () => {
    it('round-trips binary including non-UTF8 bytes', () => {
      const plain = Buffer.concat([randomBytes(256), Buffer.from([0, 255, 0])]);
      const enc = service.encryptBytes(plain);
      expect(service.decryptToBytes(enc).equals(plain)).toBe(true);
    });

    it('round-trips UTF-8 as bytes', () => {
      const text = 'hello';
      expect(
        service
          .decryptToBytes(service.encryptBytes(Buffer.from(text, 'utf8')))
          .toString('utf8'),
      ).toBe(text);
    });
  });

  describe('decrypt failures', () => {
    it('throws on tampered payload', () => {
      const payload = service.encrypt('secret');
      const buf = Buffer.from(payload, 'base64');
      buf[buf.length - 1] ^= 1;
      expect(() => service.decrypt(buf.toString('base64'))).toThrow();
    });

    it('throws on invalid base64 length (too short)', () => {
      expect(() => service.decrypt('YQ==')).toThrow(
        'Invalid encryption payload',
      );
    });

    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => new EncryptionService()).toThrow(
        'ENCRYPTION_KEY is required',
      );
    });

    it('throws when ENCRYPTION_KEY has invalid format', () => {
      process.env.ENCRYPTION_KEY = 'not-hex-or-base64';
      expect(() => new EncryptionService()).toThrow(
        'ENCRYPTION_KEY must be 32 bytes',
      );
    });
  });
});
