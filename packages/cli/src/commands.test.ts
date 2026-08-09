import { beforeEach, describe, expect, it, vi } from "vitest";

const createSecret = vi.fn();
const getSecret = vi.fn();
const encryptNoteForPassword = vi.fn(async (content: string) => {
  return JSON.stringify({ v: 1, salt: "salt", note: { iv: "iv", c: "cipher", t: "tag" } });
});

vi.mock("@getsecret/sdk", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApiError";
    }
  },
  createSecretClient: () => ({ createSecret, getSecret }),
  encryptNoteForPassword,
  DEFAULT_SECRET_API_ORIGIN: "https://api.getsecret.visionly.dev",
}));

describe("commands", () => {
  beforeEach(() => {
    createSecret.mockReset();
    getSecret.mockReset();
  });

  it("runCreateCommand prints API resource URL", async () => {
    createSecret.mockResolvedValue({ slug: "abc", expiresAt: null, maxViews: 1 });
    const { runCreateCommand } = await import("./commands/create.js");
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((msg) => {
      logs.push(String(msg));
    });

    await runCreateCommand(
      { apiUrl: "https://api.example" },
      { content: "hello", maxViews: 1 },
    );

    expect(createSecret).toHaveBeenCalledWith({ content: "hello", maxViews: 1 });
    expect(logs).toEqual(["https://api.example/s/abc"]);

    logSpy.mockRestore();
  });

  it("encrypts content when password is provided", async () => {
    createSecret.mockResolvedValue({ slug: "abc", expiresAt: null, maxViews: 1 });
    const { runCreateCommand } = await import("./commands/create.js");

    await runCreateCommand(
      { apiUrl: "https://api.example" },
      { content: "hello", password: "StrongPass1!" },
    );

    expect(encryptNoteForPassword).toHaveBeenCalledWith("hello", "StrongPass1!");
    expect(createSecret).toHaveBeenCalledWith({
      content: expect.any(String),
      password: "StrongPass1!",
    });
  });

  it("runGetCommand prints secret content", async () => {
    getSecret.mockResolvedValue({
      payloadMode: "SERVER_ENCRYPTED",
      content: "secret text",
      attachment: null,
    });
    const { runGetCommand } = await import("./commands/get.js");
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((msg) => {
      logs.push(String(msg));
    });

    await runGetCommand(
      { apiUrl: "https://api.example" },
      { slug: "abc", password: "pw" },
    );

    expect(getSecret).toHaveBeenCalledWith("abc", "pw");
    expect(logs).toEqual(["secret text"]);

    logSpy.mockRestore();
  });
});
