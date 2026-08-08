import { describe, expect, it, vi } from "vitest";
import { createSecretClient, resolveBaseUrl } from "./client.js";
import { ApiError } from "./errors.js";
import {
  DEFAULT_SECRET_API_ORIGIN,
  SECRET_PASSWORD_HEADER,
} from "./constants.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("resolveBaseUrl", () => {
  it("returns empty string for explicit empty baseUrl", () => {
    expect(resolveBaseUrl("")).toBe("");
  });

  it("strips trailing slash from explicit baseUrl", () => {
    expect(resolveBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
  });

  it("uses package default when no explicit url", () => {
    expect(resolveBaseUrl()).toBe(DEFAULT_SECRET_API_ORIGIN);
  });
});

describe("createSecretClient", () => {
  it("POST /s with JSON body on createNote without file", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          slug: "abc",
          expiresAt: null,
          maxViews: null,
        },
        201,
      ),
    );

    const client = createSecretClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
    });

    const result = await client.createSecret({
      content: "hello",
      maxViews: 3,
    });

    expect(result.slug).toBe("abc");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/s");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({
      content: "hello",
      maxViews: 3,
    });
  });

  it("POST /s/multipart when file is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ slug: "x", expiresAt: null, maxViews: null }, 201),
    );
    const file = new File(["bytes"], "doc.pdf", { type: "application/pdf" });

    const client = createSecretClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
    });

    await client.createNote({ content: "see file", file });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/s/multipart");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("sends X-Secret-Password on getNote when password provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        payloadMode: "SERVER_ENCRYPTED",
        content: "secret",
        attachment: null,
      }),
    );

    const client = createSecretClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
    });

    await client.getSecret("my-slug", "pw123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/s/my-slug");
    expect((init.headers as Record<string, string>)[SECRET_PASSWORD_HEADER]).toBe(
      "pw123",
    );
  });

  it("URL-encodes slug in getNote path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        payloadMode: "SERVER_ENCRYPTED",
        content: "x",
        attachment: null,
      }),
    );

    const client = createSecretClient({
      baseUrl: "",
      fetch: fetchMock,
    });

    await client.getNote("a/b c");

    expect(fetchMock.mock.calls[0][0]).toBe("/s/a%2Fb%20c");
  });

  it("throws ApiError with parsed body on non-OK response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "PASSWORD_REQUIRED", message: "Need pw" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "PASSWORD_REQUIRED", message: "Need pw" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const client = createSecretClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
    });

    await expect(client.getNote("slug")).rejects.toMatchObject({
      message: "Need pw",
      status: 403,
      body: { code: "PASSWORD_REQUIRED", message: "Need pw" },
    });
    await expect(client.getNote("slug")).rejects.toBeInstanceOf(ApiError);
  });

  it("passes AbortSignal from client options to fetch", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ slug: "a", expiresAt: null, maxViews: null }, 201),
    );

    const client = createSecretClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
      signal: controller.signal,
    });

    await client.createNote({ content: "x" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});

describe("parseErrorBody", () => {
  it("returns undefined for invalid JSON", async () => {
    const { parseErrorBody } = await import("./errors.js");
    expect(parseErrorBody("not json")).toBeUndefined();
  });
});
