export { createSecretClient, resolveBaseUrl } from "./client.js";
export type { SecretClient } from "./client.js";
export {
  DEFAULT_SECRET_API_ORIGIN,
  SECRET_PASSWORD_HEADER,
} from "./constants.js";
export { ApiError, parseErrorBody } from "./errors.js";
export { encryptNoteForPassword } from "./secret-crypto.js";
export type { NoteErrorBody } from "./errors.js";
export type {
  CreateNoteInput,
  CreateNoteResult,
  CreateSecretInput,
  CreateSecretResult,
  GetNoteResult,
  GetSecretResult,
  NoteAttachment,
  NoteErrorCode,
  NotePayloadMode,
  SecretClientOptions,
  SecretPayloadMode,
} from "./types.js";
