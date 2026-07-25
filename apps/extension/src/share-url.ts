/** Website origin for share links (extension UI layer, not API). */
export function buildShareUrl(slug: string): string {
  const raw =
    import.meta.env.VITE_WEB_URL ?? "https://getsecret.visionly.dev";
  return `${String(raw).replace(/\/$/, "")}/s/${slug}`;
}
