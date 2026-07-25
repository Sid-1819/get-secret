import { createSecretClient } from "@getsecret/sdk";

export const secretClient = createSecretClient({
  baseUrl: import.meta.env.VITE_API_URL || "",
});

export { ApiError, buildShareUrl } from "@getsecret/sdk";
export type { GetNoteResult, NoteErrorCode } from "@getsecret/sdk";

export function getNote(slug: string, password?: string) {
  return secretClient.getNote(slug, password);
}
