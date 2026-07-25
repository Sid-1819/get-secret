import {
  DEFAULT_SECRET_API_ORIGIN,
  SECRET_PASSWORD_HEADER,
} from "./constants.js";
import { ApiError, parseErrorBody } from "./errors.js";
import type {
  CreateNoteInput,
  CreateNoteResult,
  GetNoteResult,
  SecretClientOptions,
} from "./types.js";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

/** Resolve API origin: explicit option or package default. Empty string = same-origin relative URLs. */
export function resolveBaseUrl(explicitBaseUrl?: string): string {
  if (explicitBaseUrl === "") return "";
  const trimmed = explicitBaseUrl?.trim();
  if (trimmed) return normalizeBaseUrl(trimmed);
  return normalizeBaseUrl(DEFAULT_SECRET_API_ORIGIN);
}

function errorMessageFromText(text: string, status: number): string {
  const trimmed = text.trim();
  const parsed = parseErrorBody(trimmed);
  if (parsed?.message) return parsed.message;
  if (trimmed) return trimmed;
  return `Request failed (${status})`;
}

function appendCreateFields(fd: FormData, input: CreateNoteInput): void {
  fd.append("content", input.content);
  if (input.expiresAt != null && input.expiresAt !== "") {
    fd.append("expiresAt", input.expiresAt);
  }
  if (input.maxViews != null) {
    fd.append("maxViews", String(input.maxViews));
  }
  if (input.password != null && input.password !== "") {
    fd.append("password", input.password);
  }
}

function withSignal(init: RequestInit, signal?: AbortSignal): RequestInit {
  return signal ? { ...init, signal } : init;
}

export function createSecretClient(options: SecretClientOptions = {}) {
  const base = resolveBaseUrl(options.baseUrl);
  const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  const defaultSignal = options.signal;

  async function createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    const useMultipart = Boolean(input.file);

    if (useMultipart) {
      const path = `${base}/s/multipart`;
      const fd = new FormData();
      appendCreateFields(fd, input);
      fd.append("file", input.file!, input.file!.name);
      if (input.password != null && input.password !== "") {
        fd.append(
          "attachmentMimeType",
          (input.attachmentMimeType ?? input.file!.type) || "application/octet-stream",
        );
        fd.append(
          "attachmentFileName",
          (input.attachmentFileName ?? input.file!.name) || "attachment",
        );
      }
      const res = await fetchFn(
        path,
        withSignal(
          {
            method: "POST",
            body: fd,
          },
          defaultSignal,
        ),
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const body = parseErrorBody(text);
        throw new ApiError(errorMessageFromText(text, res.status), res.status, body);
      }

      return res.json() as Promise<CreateNoteResult>;
    }

    const path = `${base}/s`;
    const res = await fetchFn(
      path,
      withSignal(
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: input.content,
            expiresAt: input.expiresAt,
            maxViews: input.maxViews,
            password: input.password,
          }),
        },
        defaultSignal,
      ),
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const body = parseErrorBody(text);
      throw new ApiError(errorMessageFromText(text, res.status), res.status, body);
    }

    return res.json() as Promise<CreateNoteResult>;
  }

  async function getNote(
    slug: string,
    password?: string,
  ): Promise<GetNoteResult> {
    const headers: HeadersInit = {};
    if (password !== undefined && password !== "") {
      headers[SECRET_PASSWORD_HEADER] = password;
    }
    const path = `${base}/s/${encodeURIComponent(slug)}`;
    const res = await fetchFn(
      path,
      withSignal(
        {
          headers: Object.keys(headers).length ? headers : undefined,
        },
        defaultSignal,
      ),
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const body = parseErrorBody(text);
      throw new ApiError(
        errorMessageFromText(text, res.status),
        res.status,
        body,
      );
    }

    return res.json() as Promise<GetNoteResult>;
  }

  const createSecret = createNote;
  const getSecret = getNote;

  return { createNote, getNote, createSecret, getSecret };
}

export type SecretClient = ReturnType<typeof createSecretClient>;
