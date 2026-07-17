/** Rate limiting */
export const RATE_LIMIT_WINDOW_SEC = 60;
export const RATE_LIMIT_MAX_REQUESTS = 30;
export const RATE_LIMIT_KEY_PREFIX = 'ratelimit:ip:';

/** Create-note rate limits (per IP+User-Agent hash) */
export const RATE_LIMIT_CREATE_MINUTE_WINDOW_SEC = 60;
export const RATE_LIMIT_CREATE_MINUTE_MAX = 3;
export const RATE_LIMIT_CREATE_DAILY_WINDOW_SEC = 86400; // 24h
export const RATE_LIMIT_CREATE_DAILY_MAX = 10;
export const RATE_LIMIT_CLIENT_KEY_PREFIX = 'ratelimit:client:';

/** Note cache */
export const CACHE_KEY_PREFIX = 'note:';
export const CACHE_MAX_TTL_SEC = 3600; // 1 hour

/** Per-slug wrong password rate limit (brute-force protection) */
export const WRONG_PASSWORD_KEY_PREFIX = 'wrong_password:';
export const WRONG_PASSWORD_WINDOW_SEC = 900; // 15 min
export const WRONG_PASSWORD_MAX_ATTEMPTS = 5;
