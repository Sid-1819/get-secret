/**
 * Default production API origin when `createSecretClient({ baseUrl })` is omitted.
 */
export const DEFAULT_SECRET_API_ORIGIN = "https://api.getsecret.visionly.dev";

/** HTTP header for passphrase-protected secret reads (matches backend `x-secret-password`). */
export const SECRET_PASSWORD_HEADER = "X-Secret-Password";
