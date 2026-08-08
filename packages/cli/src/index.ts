import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { runCreateCommand } from "./commands/create.js";
import { runGetCommand } from "./commands/get.js";
import { resolveCliConfig } from "./config.js";

const HELP = `getsecret — ephemeral secret sharing CLI

Usage:
  getsecret create <content> [options]
  getsecret get <slug> [options]
  getsecret --help

Global options:
  --api-url <url>   API origin (overrides GETSECRET_API_URL / config file)

Create options:
  --max-views <n>   Maximum number of views
  --expires-at <iso>  ISO 8601 expiry datetime
  --password <pass>   Passphrase for the secret

Get options:
  --password <pass>   Passphrase required to read the secret
`;

type ParsedCli = {
  command?: string;
  content?: string;
  slug?: string;
  apiUrl?: string;
  maxViews?: number;
  expiresAt?: string;
  password?: string;
  help: boolean;
};

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`Invalid value for ${flag}: ${value}`);
    process.exit(1);
  }
  return parsed;
}

export function parseCliArgs(argv: string[]): ParsedCli {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      "api-url": { type: "string" },
      "max-views": { type: "string" },
      "expires-at": { type: "string" },
      password: { type: "string" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];
  const result: ParsedCli = {
    command,
    apiUrl: values["api-url"],
    expiresAt: values["expires-at"],
    password: values.password,
    help: values.help === true,
  };

  if (values["max-views"] != null) {
    result.maxViews = parseNumber(values["max-views"], "--max-views");
  }

  if (command === "create") {
    result.content = positionals.slice(1).join(" ");
  } else if (command === "get") {
    result.slug = positionals[1];
  }

  return result;
}

export async function runCli(argv: string[]): Promise<void> {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const parsed = parseCliArgs(args);

  if (parsed.help || !parsed.command || parsed.command === "--help") {
    console.log(HELP.trimEnd());
    return;
  }

  const config = resolveCliConfig({
    apiUrl: parsed.apiUrl,
  });

  switch (parsed.command) {
    case "create": {
      if (!parsed.content) {
        console.error("Missing content. Usage: getsecret create <content>");
        process.exit(1);
      }
      await runCreateCommand(config, {
        content: parsed.content,
        maxViews: parsed.maxViews,
        expiresAt: parsed.expiresAt,
        password: parsed.password,
      });
      return;
    }
    case "get": {
      if (!parsed.slug) {
        console.error("Missing slug. Usage: getsecret get <slug>");
        process.exit(1);
      }
      await runGetCommand(config, {
        slug: parsed.slug,
        password: parsed.password,
      });
      return;
    }
    default:
      console.error(`Unknown command: ${parsed.command}`);
      console.error(HELP.trimEnd());
      process.exit(1);
  }
}

async function main(): Promise<void> {
  await runCli(process.argv.slice(2));
}

const isMainModule =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
