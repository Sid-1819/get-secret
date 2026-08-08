import { describe, expect, it, vi } from "vitest";
import { parseCliArgs } from "./index.js";

describe("parseCliArgs", () => {
  it("parses create command with content", () => {
    expect(parseCliArgs(["create", "hello", "world"])).toMatchObject({
      command: "create",
      content: "hello world",
    });
  });

  it("parses create options", () => {
    expect(
      parseCliArgs([
        "create",
        "secret",
        "--max-views",
        "3",
        "--expires-at",
        "2026-12-31T00:00:00Z",
        "--password",
        "pw",
        "--api-url",
        "https://api.example",
        "--web-url",
        "https://web.example",
      ]),
    ).toMatchObject({
      command: "create",
      content: "secret",
      maxViews: 3,
      expiresAt: "2026-12-31T00:00:00Z",
      password: "pw",
      apiUrl: "https://api.example",
      webUrl: "https://web.example",
    });
  });

  it("parses get command with slug and password", () => {
    expect(parseCliArgs(["get", "abc123", "--password", "pw"])).toMatchObject({
      command: "get",
      slug: "abc123",
      password: "pw",
    });
  });

  it("sets help flag", () => {
    expect(parseCliArgs(["--help"]).help).toBe(true);
  });
});

describe("runCli argv handling", () => {
  it("strips pnpm passthrough -- separator", async () => {
    const { runCli } = await import("./index.js");
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    await runCli(["--", "--help"]);
    expect(logs.join("\n")).toContain("getsecret — ephemeral secret sharing CLI");

    logSpy.mockRestore();
  });
});
