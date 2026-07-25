/** Error codes returned in JSON body for note read failures (403 / 429). */
export type NoteErrorCode =
  | "PASSWORD_REQUIRED"
  | "INVALID_PASSWORD"
  | "WRONG_PASSWORD_LIMIT";

/** Matches server `SecretPayloadMode`. */
export type NotePayloadMode = "SERVER_ENCRYPTED" | "CLIENT_CIPHERTEXT";

/** @deprecated Use `NotePayloadMode`. */
export type SecretPayloadMode = NotePayloadMode;

export type CreateNoteInput = {
  content: string;
  /** ISO 8601 datetime string; optional on server. */
  expiresAt?: string;
  maxViews?: number;
  password?: string;
  /** When set, `POST /s/multipart` is used. */
  file?: File;
  /**
   * With `password` + `file`, use the original file MIME and name (the `file` part may be an encrypted blob).
   */
  attachmentMimeType?: string;
  attachmentFileName?: string;
};

export type CreateNoteResult = {
  slug: string;
  expiresAt: string | null;
  maxViews: number | null;
};

export type NoteAttachment = {
  mimeType: string;
  originalName: string;
  /** SERVER_ENCRYPTED: base64 of plaintext file bytes. CLIENT_CIPHERTEXT: opaque JSON ciphertext envelope. */
  data: string;
};

export type GetNoteResult = {
  payloadMode: NotePayloadMode;
  content: string;
  attachment: NoteAttachment | null;
};

export type CreateSecretInput = CreateNoteInput;
export type CreateSecretResult = CreateNoteResult;
export type GetSecretResult = GetNoteResult;

export type SecretClientOptions = {
  /**
   * API origin without trailing slash. If omitted, uses the package default origin.
   * Browser apps should pass `baseUrl` (e.g. from `import.meta.env.VITE_API_URL`).
   * Pass empty string for same-origin relative URLs.
   */
  baseUrl?: string;
  /** Override fetch (tests, custom runtimes). Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** AbortSignal applied to every request from this client instance. */
  signal?: AbortSignal;
};
