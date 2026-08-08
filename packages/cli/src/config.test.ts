import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCliConfig } from "./config.js";
import { DEFAULT_SECRET_API_ORIGIN } from "@getsecret/sdk";

describe("resolveCliConfig", () => {
  const originalEnv = process.env;
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), "getsecret-cli-"));
    vi.stubEnv("HOME", tempHome);
    process.env = { ...originalEnv };
    delete process.env.GETSECRET_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it("uses SDK default when nothing is configured", () => {
    expect(resolveCliConfig()).toEqual({
      apiUrl: DEFAULT_SECRET_API_ORIGIN,
    });
  });

  it("prefers CLI overrides over env and file", () => {
    process.env.GETSECRET_API_URL = "https://env-api.example";

    const configDir = join(tempHome, ".config", "getsecret");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiUrl: "https://file-api.example",
      }),
    );

    expect(
      resolveCliConfig({
        apiUrl: "https://flag-api.example/",
      }),
    ).toEqual({
      apiUrl: "https://flag-api.example",
    });
  });

  it("prefers env over config file", () => {
    const configDir = join(tempHome, ".config", "getsecret");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiUrl: "https://file-api.example",
      }),
    );

    process.env.GETSECRET_API_URL = "https://env-api.example/";

    expect(resolveCliConfig()).toEqual({
      apiUrl: "https://env-api.example",
    });
  });
});
