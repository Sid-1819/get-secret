const NOTE_CRYPTO_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromB64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export type ClientNoteEnvelope = {
  v: 1;
  salt: string;
  note: {
    iv: string;
    c: string;
    t: string;
  };
};

export async function encryptNoteForPassword(
  plaintext: string,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_BYTES),
  );

  const key = await deriveAesKey(password, salt);

  const iv = crypto.getRandomValues(
    new Uint8Array(IV_BYTES),
  );

  const plaintextBytes = new TextEncoder().encode(plaintext);

  const cipherBuf = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(iv),
    },
    key,
    asArrayBuffer(plaintextBytes),
  );

  const full = new Uint8Array(cipherBuf);

  const c = full.subarray(
    0,
    full.length - GCM_TAG_BYTES,
  );

  const t = full.subarray(
    full.length - GCM_TAG_BYTES,
  );

  const envelope: ClientNoteEnvelope = {
    v: 1,
    salt: toB64(salt),
    note: {
      iv: toB64(iv),
      c: toB64(c),
      t: toB64(t),
    },
  };

  return JSON.stringify(envelope);
}