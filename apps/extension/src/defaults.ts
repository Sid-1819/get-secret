/** Chrome storage keys — popup, background, content script stay in sync. */

export const NOTE_EXPIRY_PRESET_KEY = "noteExpiryPreset";
export const NOTE_VIEWS_PRESET_KEY = "noteViewsPreset";
export const NOTE_ONE_TIME_VIEW_KEY = "noteOneTimeView";
export const FLOATING_ICON_ENABLED_KEY = "floatingIconEnabled";

/** Legacy keys (migration only). */
export const NOTE_EXPIRES_AFTER_MINUTES_KEY = "noteExpiresAfterMinutes";
export const NOTE_MAX_VIEWS_KEY = "noteMaxViews";

export type ExpiryPresetId = "5m" | "10m" | "1h" | "24h";
export type ViewsPresetId = "3" | "5" | "10";

export const EXPIRY_PRESET_IDS: readonly ExpiryPresetId[] = [
  "5m",
  "10m",
  "1h",
  "24h",
];

export const VIEWS_PRESET_IDS: readonly ViewsPresetId[] = ["3", "5", "10"];

export const DEFAULT_EXPIRY_PRESET: ExpiryPresetId = "24h";
export const DEFAULT_VIEWS_PRESET: ViewsPresetId = "3";

export function expiryPresetToMinutes(id: ExpiryPresetId): number {
  const map: Record<ExpiryPresetId, number> = {
    "5m": 5,
    "10m": 10,
    "1h": 60,
    "24h": 1440,
  };
  return map[id];
}

export function viewsPresetToMaxViews(id: ViewsPresetId): number {
  return Number(id);
}

export function isExpiryPresetId(v: unknown): v is ExpiryPresetId {
  return typeof v === "string" && EXPIRY_PRESET_IDS.includes(v as ExpiryPresetId);
}

export function isViewsPresetId(v: unknown): v is ViewsPresetId {
  return typeof v === "string" && VIEWS_PRESET_IDS.includes(v as ViewsPresetId);
}

function nearestExpiryPresetFromMinutes(minutes: number): ExpiryPresetId {
  const candidates: { id: ExpiryPresetId; m: number }[] = EXPIRY_PRESET_IDS.map(
    (id) => ({ id, m: expiryPresetToMinutes(id) }),
  );
  let best = candidates[0]!;
  let bestDist = Math.abs(minutes - best.m);
  for (const c of candidates) {
    const d = Math.abs(minutes - c.m);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best.id;
}

function nearestViewsPresetFromCount(v: number): ViewsPresetId {
  let best = VIEWS_PRESET_IDS[0]!;
  let bestDist = Math.abs(v - Number(best));
  for (const id of VIEWS_PRESET_IDS) {
    const d = Math.abs(v - Number(id));
    if (d < bestDist) {
      best = id;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Ensures preset keys exist; maps legacy minute/maxViews once to nearest presets.
 */
export async function migrateNoteStorageIfNeeded(): Promise<void> {
  const data = await chrome.storage.local.get(null);
  const patches: Record<string, unknown> = {};

  if (!isExpiryPresetId(data[NOTE_EXPIRY_PRESET_KEY])) {
    const legacy = Number(data[NOTE_EXPIRES_AFTER_MINUTES_KEY]);
    patches[NOTE_EXPIRY_PRESET_KEY] = Number.isFinite(legacy)
      ? nearestExpiryPresetFromMinutes(Math.max(1, Math.floor(legacy)))
      : DEFAULT_EXPIRY_PRESET;
  }

  if (!isViewsPresetId(data[NOTE_VIEWS_PRESET_KEY])) {
    const legacy = Number(data[NOTE_MAX_VIEWS_KEY]);
    patches[NOTE_VIEWS_PRESET_KEY] = Number.isFinite(legacy)
      ? nearestViewsPresetFromCount(Math.floor(legacy))
      : DEFAULT_VIEWS_PRESET;
  }

  if (data[FLOATING_ICON_ENABLED_KEY] === undefined) {
    patches[FLOATING_ICON_ENABLED_KEY] = true;
  }

  if (Object.keys(patches).length > 0) {
    await chrome.storage.local.set(patches);
  }
}

/** Resolved numbers for POST /s (one-time overrides expiry + views). */
export async function readResolvedNoteCreationParams(): Promise<{
  expiresAfterMinutes: number;
  maxViews: number;
}> {
  await migrateNoteStorageIfNeeded();
  const data = await chrome.storage.local.get([
    NOTE_EXPIRY_PRESET_KEY,
    NOTE_VIEWS_PRESET_KEY,
    NOTE_ONE_TIME_VIEW_KEY,
  ]);

  if (data[NOTE_ONE_TIME_VIEW_KEY] === true) {
    return { expiresAfterMinutes: 5, maxViews: 1 };
  }

  const expiryId = isExpiryPresetId(data[NOTE_EXPIRY_PRESET_KEY])
    ? data[NOTE_EXPIRY_PRESET_KEY]
    : DEFAULT_EXPIRY_PRESET;
  const viewsId = isViewsPresetId(data[NOTE_VIEWS_PRESET_KEY])
    ? data[NOTE_VIEWS_PRESET_KEY]
    : DEFAULT_VIEWS_PRESET;

  return {
    expiresAfterMinutes: expiryPresetToMinutes(expiryId),
    maxViews: viewsPresetToMaxViews(viewsId),
  };
}
