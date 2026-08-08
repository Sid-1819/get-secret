import { createSecretClient } from "@getsecret/sdk";

export const secretClient = createSecretClient({
  baseUrl: import.meta.env.VITE_API_URL || "",
});

export { ApiError } from "@getsecret/sdk";
export type { GetNoteResult, NoteErrorCode } from "@getsecret/sdk";

/** Build a share link for a secret slug on a given website origin. */
export function buildShareUrl(webOrigin: string, slug: string): string {
  return `${webOrigin.replace(/\/$/, "")}/s/${slug}`;
}

export function getNote(slug: string, password?: string) {
  return secretClient.getNote(slug, password);
}
