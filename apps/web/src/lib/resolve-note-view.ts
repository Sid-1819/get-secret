import {
  decryptFileWithPassword,
  decryptNoteWithPassword,
  parseNoteEnvelopeSalt,
} from "@/lib/note-crypto";

/** API `GET /s/:slug` JSON body (aligned with `@getsecret/sdk` `GetNoteResult`). */
export type NoteViewPayload = {
  payloadMode: "SERVER_ENCRYPTED" | "CLIENT_CIPHERTEXT";
  content: string;
  attachment: { mimeType: string; originalName: string; data: string } | null;
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBlobBuffer(u: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u.byteLength);
  copy.set(u);
  return copy.buffer;
}

export type ResolvedNoteView = {
  text: string;
  fileUrl: string | null;
  fileLabel: string | null;
};

export async function resolveNoteView(
  result: NoteViewPayload,
  password?: string,
): Promise<ResolvedNoteView> {
  if (result.payloadMode === "CLIENT_CIPHERTEXT") {
    if (!password) {
      throw new Error("Passphrase required to decrypt this note");
    }
    const text = await decryptNoteWithPassword(result.content, password);
    let fileUrl: string | null = null;
    const fileLabel = result.attachment?.originalName ?? null;
    if (result.attachment) {
      const salt = parseNoteEnvelopeSalt(result.content);
      const bytes = await decryptFileWithPassword(result.attachment.data, password, salt);
      const blob = new Blob([toBlobBuffer(bytes)], { type: result.attachment.mimeType });
      fileUrl = URL.createObjectURL(blob);
    }
    return { text, fileUrl, fileLabel };
  }

  let fileUrl: string | null = null;
  const fileLabel = result.attachment?.originalName ?? null;
  if (result.attachment) {
    const raw = base64ToBytes(result.attachment.data);
    const blob = new Blob([toBlobBuffer(raw)], { type: result.attachment.mimeType });
    fileUrl = URL.createObjectURL(blob);
  }
  return { text: result.content, fileUrl, fileLabel };
}
