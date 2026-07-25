import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DEFAULT_SECRET_API_ORIGIN } from "@getsecret/sdk";

export type CliConfig = {
  apiUrl?: string;
  webUrl?: string;
};

const DEFAULT_WEB_ORIGIN = "https://getsecret.visionly.dev";

function readConfigFile(): CliConfig {
  const configPath = path.join(homedir(), ".config", "getsecret", "config.json");
  try {
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as CliConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function resolveApiUrl(explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  const fromEnv = process.env.GETSECRET_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromFile = readConfigFile().apiUrl?.trim();
  if (fromFile) return fromFile.replace(/\/$/, "");
  return DEFAULT_SECRET_API_ORIGIN;
}

export function resolveWebUrl(explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  const fromEnv = process.env.GETSECRET_WEB_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromFile = readConfigFile().webUrl?.trim();
  if (fromFile) return fromFile.replace(/\/$/, "");
  return DEFAULT_WEB_ORIGIN;
}
