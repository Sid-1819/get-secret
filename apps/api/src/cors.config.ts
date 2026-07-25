/** Comma-separated origins, or `*` to allow any browser origin (default for public SDK use). */
export function parseCorsOrigins(raw: string | undefined): '*' | string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === '*') return '*';
  const list = trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (list.includes('*')) return '*';
  return list;
}

export type CorsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

export function createCorsOriginCallback(config: '*' | string[]): CorsOriginCallback {
  if (config === '*') {
    return (_origin, callback) => callback(null, true);
  }

  const allowed = new Set(config);
  return (origin, callback) => {
    if (!origin || allowed.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  };
}
