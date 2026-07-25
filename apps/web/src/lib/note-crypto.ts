const NOTE_CRYPTO_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toB64Bytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function fromB64(s: string): Uint8Array {
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Copy to a standalone `ArrayBuffer` for Web Crypto `BufferSource` typing. */
function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

async function importKeyMaterial(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await importKeyMaterial(password);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export type ClientNoteEnvelope = {
  v: number;
  salt: string;
  note: { iv: string; c: string; t: string };
};

export type ClientFileEnvelope = {
  v: number;
  iv: string;
  c: string;
  t: string;
};

export async function encryptNoteForPassword(
  plaintext: string,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveAesKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(enc.encode(plaintext)),
  );
  const full = new Uint8Array(cipherBuf);
  const tagLen = 16;
  const c = full.subarray(0, full.length - tagLen);
  const t = full.subarray(full.length - tagLen);
  const envelope: ClientNoteEnvelope = {
    v: NOTE_CRYPTO_VERSION,
    salt: toB64Bytes(salt),
    note: {
      iv: toB64Bytes(iv),
      c: toB64Bytes(c),
      t: toB64Bytes(t),
    },
  };
  return JSON.stringify(envelope);
}

export async function decryptNoteWithPassword(
  envelopeJson: string,
  password: string,
): Promise<string> {
  const envelope = JSON.parse(envelopeJson) as ClientNoteEnvelope;
  if (envelope.v !== 1 || !envelope.salt || !envelope.note) {
    throw new Error("Unsupported note format");
  }
  const salt = fromB64(envelope.salt);
  const key = await deriveAesKey(password, salt);
  const iv = fromB64(envelope.note.iv);
  const c = fromB64(envelope.note.c);
  const t = fromB64(envelope.note.t);
  const combined = new Uint8Array(c.length + t.length);
  combined.set(c, 0);
  combined.set(t, c.length);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(combined),
  );
  return new TextDecoder().decode(plainBuf);
}

export async function encryptFileForPassword(
  fileBytes: Uint8Array,
  password: string,
  saltB64: string,
): Promise<string> {
  const salt = fromB64(saltB64);
  const key = await deriveAesKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(fileBytes),
  );
  const full = new Uint8Array(cipherBuf);
  const tagLen = 16;
  const c = full.subarray(0, full.length - tagLen);
  const t = full.subarray(full.length - tagLen);
  const fileEnv: ClientFileEnvelope = {
    v: NOTE_CRYPTO_VERSION,
    iv: toB64Bytes(iv),
    c: toB64Bytes(c),
    t: toB64Bytes(t),
  };
  return JSON.stringify(fileEnv);
}

export async function decryptFileWithPassword(
  fileEnvelopeJson: string,
  password: string,
  saltB64: string,
): Promise<Uint8Array> {
  const env = JSON.parse(fileEnvelopeJson) as ClientFileEnvelope;
  if (env.v !== 1) throw new Error("Unsupported file format");
  const salt = fromB64(saltB64);
  const key = await deriveAesKey(password, salt);
  const iv = fromB64(env.iv);
  const c = fromB64(env.c);
  const t = fromB64(env.t);
  const combined = new Uint8Array(c.length + t.length);
  combined.set(c, 0);
  combined.set(t, c.length);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(combined),
  );
  return new Uint8Array(plainBuf);
}

export function parseNoteEnvelopeSalt(envelopeJson: string): string {
  const envelope = JSON.parse(envelopeJson) as ClientNoteEnvelope;
  if (envelope.v !== 1 || typeof envelope.salt !== "string") {
    throw new Error("Invalid envelope");
  }
  return envelope.salt;
}
