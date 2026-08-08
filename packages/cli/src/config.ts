import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SECRET_API_ORIGIN } from "@getsecret/sdk";

export type CliConfig = {
  apiUrl: string;
};

export type CliConfigOverrides = {
  apiUrl?: string;
};

type ConfigFile = {
  apiUrl?: string;
};

function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, "");
}

function readConfigFile(): ConfigFile {
  const configPath = join(homedir(), ".config", "getsecret", "config.json");
  try {
    const raw = readFileSync(configPath, "utf8");
    return JSON.parse(raw) as ConfigFile;
  } catch {
    return {};
  }
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function resolveCliConfig(overrides: CliConfigOverrides = {}): CliConfig {
  const file = readConfigFile();

  const apiUrl = normalizeOrigin(
    firstDefined(
      overrides.apiUrl,
      process.env.GETSECRET_API_URL,
      file.apiUrl,
      DEFAULT_SECRET_API_ORIGIN,
    )!,
  );

  return { apiUrl };
}
