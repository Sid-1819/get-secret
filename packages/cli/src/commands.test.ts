import { beforeEach, describe, expect, it, vi } from "vitest";

const createSecret = vi.fn();
const getSecret = vi.fn();

vi.mock("@getsecret/sdk", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApiError";
    }
  },
  buildShareUrl: (webUrl: string, slug: string) => `${webUrl}/s/${slug}`,
  createSecretClient: () => ({ createSecret, getSecret }),
  DEFAULT_SECRET_API_ORIGIN: "https://api.getsecret.visionly.dev",
}));

describe("commands", () => {
  beforeEach(() => {
    createSecret.mockReset();
    getSecret.mockReset();
  });

  it("runCreateCommand prints share URL", async () => {
    createSecret.mockResolvedValue({ slug: "abc", expiresAt: null, maxViews: 1 });
    const { runCreateCommand } = await import("./commands/create.js");
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((msg) => {
      logs.push(String(msg));
    });

    await runCreateCommand(
      { apiUrl: "https://api.example", webUrl: "https://web.example" },
      { content: "hello", maxViews: 1 },
    );

    expect(createSecret).toHaveBeenCalledWith({ content: "hello", maxViews: 1 });
    expect(logs).toEqual(["https://web.example/s/abc"]);

    logSpy.mockRestore();
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
      { apiUrl: "https://api.example", webUrl: "https://web.example" },
      { slug: "abc", password: "pw" },
    );

    expect(getSecret).toHaveBeenCalledWith("abc", "pw");
    expect(logs).toEqual(["secret text"]);

    logSpy.mockRestore();
  });
});
