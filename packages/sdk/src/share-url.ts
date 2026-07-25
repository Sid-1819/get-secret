/** Build a share link for a secret slug on a given website origin. */
export function buildShareUrl(webOrigin: string, slug: string): string {
  return `${webOrigin.replace(/\/$/, "")}/s/${slug}`;
}
