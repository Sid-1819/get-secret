import { BadRequestException } from '@nestjs/common';

/** Max decoded file size (same order of magnitude as note content cap). */
export const ATTACHMENT_MAX_BYTES = 1_048_576;

/** Multipart file field size ceiling (bytes on wire). */
export const MULTIPART_FILE_FIELD_MAX_BYTES = ATTACHMENT_MAX_BYTES + 256 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

export function assertAllowedMimeType(mime: string): void {
  const normalized = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(normalized)) {
    throw new BadRequestException({
      message: `Unsupported file type: ${mime || '(empty)'}`,
      code: 'UNSUPPORTED_MIME',
    });
  }
}

const ORIGINAL_NAME_MAX = 255;

/** Strip path segments and unsafe characters; never empty after trim. */
export function sanitizeOriginalFileName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').trim();
  const cut = cleaned.slice(0, ORIGINAL_NAME_MAX);
  if (!cut) {
    throw new BadRequestException({
      message: 'Invalid file name',
      code: 'INVALID_FILENAME',
    });
  }
  return cut;
}

type ClientNoteJson = {
  v: number;
  salt: string;
  note: { iv: string; c: string; t: string };
};

type ClientFileJson = {
  v: number;
  iv: string;
  c: string;
  t: string;
};

function isNonEmptyB64(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0 && /^[A-Za-z0-9+/]+=*$/.test(s);
}

/** Validate client-side ciphertext envelope stored in `SecureNote.content` when password is set. */
export function assertValidClientNoteEnvelopeJson(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BadRequestException({
      message: 'Invalid client-encrypted note payload',
      code: 'INVALID_CLIENT_NOTE',
    });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BadRequestException({
      message: 'Invalid client-encrypted note payload',
      code: 'INVALID_CLIENT_NOTE',
    });
  }
  const o = parsed as Partial<ClientNoteJson>;
  if (
    o.v !== 1 ||
    !isNonEmptyB64(o.salt) ||
    !o.note ||
    typeof o.note !== 'object'
  ) {
    throw new BadRequestException({
      message: 'Invalid client-encrypted note payload',
      code: 'INVALID_CLIENT_NOTE',
    });
  }
  const n = o.note as Partial<ClientNoteJson['note']>;
  if (!isNonEmptyB64(n.iv) || !isNonEmptyB64(n.c) || !isNonEmptyB64(n.t)) {
    throw new BadRequestException({
      message: 'Invalid client-encrypted note payload',
      code: 'INVALID_CLIENT_NOTE',
    });
  }
}

/** Validate opaque attachment payload for client-encrypted notes. */
export function assertValidClientFileEnvelopeJson(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BadRequestException({
      message: 'Invalid client-encrypted file payload',
      code: 'INVALID_CLIENT_FILE',
    });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BadRequestException({
      message: 'Invalid client-encrypted file payload',
      code: 'INVALID_CLIENT_FILE',
    });
  }
  const o = parsed as Partial<ClientFileJson>;
  if (
    o.v !== 1 ||
    !isNonEmptyB64(o.iv) ||
    !isNonEmptyB64(o.c) ||
    !isNonEmptyB64(o.t)
  ) {
    throw new BadRequestException({
      message: 'Invalid client-encrypted file payload',
      code: 'INVALID_CLIENT_FILE',
    });
  }
}
