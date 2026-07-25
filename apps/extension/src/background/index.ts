import { createSecretClient, ApiError } from "@getsecret/sdk";
import { readResolvedNoteCreationParams } from "../defaults.js";

type SaveNoteMessage = {
  type: "SAVE_NOTE";
  payload: { text: string; password?: string };
};

type SaveNoteResponse = { slug: string } | { error: string };

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:8090";
  return raw.replace(/\/$/, "");
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse): boolean => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as SaveNoteMessage).type !== "SAVE_NOTE"
    ) {
      return false;
    }

    const { text, password } = (message as SaveNoteMessage).payload;
    if (typeof text !== "string") {
      sendResponse({ error: "Invalid payload." } satisfies SaveNoteResponse);
      return false;
    }

    void (async () => {
      try {
        const { expiresAfterMinutes, maxViews } =
          await readResolvedNoteCreationParams();
        const expiresAt = new Date(
          Date.now() + expiresAfterMinutes * 60_000,
        ).toISOString();

        const trimmedPassword =
          typeof password === "string" ? password.trim() : "";

        const client = createSecretClient({ baseUrl: apiBase() });
        const result = await client.createNote({
          content: text,
          maxViews,
          expiresAt,
          ...(trimmedPassword !== "" ? { password: trimmedPassword } : {}),
        });

        sendResponse({ slug: result.slug } satisfies SaveNoteResponse);
      } catch (e) {
        if (e instanceof ApiError) {
          sendResponse({ error: e.message } satisfies SaveNoteResponse);
          return;
        }
        sendResponse({
          error: "Network error — is the API running?",
        } satisfies SaveNoteResponse);
      }
    })();

    return true;
  },
);
