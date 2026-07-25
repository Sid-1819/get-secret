import * as p from "@clack/prompts";
import {
  ApiError,
  buildShareUrl,
  createSecretClient,
  type CreateNoteInput,
  type CreateNoteResult,
} from "@getsecret/sdk";
import { Command } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { resolveApiUrl, resolveWebUrl } from "./config.js";

function readPackageVersion(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.join(dir, "..", "package.json");
  try {
    const raw = readFileSync(pkgPath, "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseMaxViews(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error(pc.red("Invalid max views: expected a positive integer."));
    process.exit(1);
  }
  return n;
}

function hasMeaningfulPositional(content: string | undefined): boolean {
  return content !== undefined && content !== "";
}

type GlobalOpts = {
  baseUrl?: string;
  webUrl?: string;
  json?: boolean;
  includeUrl?: boolean;
};

type CreateCmdOpts = {
  expiresAt?: string;
  password?: string;
  maxViews?: string;
  file?: string;
};

async function copyUrlToClipboard(url: string): Promise<boolean> {
  try {
    const { default: clipboard } = await import("clipboardy");
    await clipboard.write(url);
    return true;
  } catch {
    return false;
  }
}

function printCreateJson(
  result: CreateNoteResult,
  shareUrl: string | undefined,
): void {
  const payload = shareUrl ? { ...result, url: shareUrl } : result;
  console.log(JSON.stringify(payload, null, 2));
}

function showCreateSuccessUi(shareUrl: string, copied: boolean): void {
  const lines = [
    pc.bold(pc.green("Note created")),
    "",
    pc.dim("URL"),
    shareUrl,
    "",
    copied
      ? pc.green("Link copied to clipboard.")
      : pc.yellow("Could not copy to clipboard; select the URL above manually."),
  ];
  p.note(lines.join("\n"), "getsecret");
}

async function collectInteractiveMeta(
  opts: CreateCmdOpts,
): Promise<Pick<CreateNoteInput, "expiresAt" | "password" | "maxViews">> {
  let expiresAt: string | undefined;
  if (opts.expiresAt !== undefined) {
    expiresAt = opts.expiresAt.trim() || undefined;
  } else {
    const v = await p.text({
      message: "Expiry (ISO 8601, leave empty to skip)",
      placeholder: "e.g. 2026-12-31T23:59:59.000Z",
      initialValue: "",
    });
    if (p.isCancel(v)) process.exit(0);
    expiresAt = v.trim() || undefined;
  }

  let password: string | undefined;
  if (opts.password !== undefined) {
    password = opts.password || undefined;
  } else {
    const v = await p.password({
      message: "Note password (leave empty to skip)",
    });
    if (p.isCancel(v)) process.exit(0);
    password = v.trim() || undefined;
  }

  let maxViews: number | undefined;
  if (opts.maxViews !== undefined) {
    maxViews = parseMaxViews(opts.maxViews);
  } else {
    const v = await p.text({
      message: "Max views (leave empty to skip)",
      placeholder: "e.g. 10",
      initialValue: "",
    });
    if (p.isCancel(v)) process.exit(0);
    maxViews = parseMaxViews(v.trim() === "" ? undefined : v);
  }

  return { expiresAt, password, maxViews };
}

async function runCreate(
  contentArg: string | undefined,
  opts: CreateCmdOpts,
  globalOpts: GlobalOpts,
): Promise<void> {
  const json = Boolean(globalOpts.json);
  const includeUrl = Boolean(globalOpts.includeUrl);
  const ttyIn = process.stdin.isTTY === true;
  const ttyOut = process.stdout.isTTY === true;
  const apiUrl = resolveApiUrl(globalOpts.baseUrl);
  const webUrl = resolveWebUrl(globalOpts.webUrl);
  const client = createSecretClient({ baseUrl: apiUrl });

  const meaningfulPos = hasMeaningfulPositional(contentArg);

  let content: string | undefined;
  if (opts.file) {
    content = readFileSync(path.resolve(opts.file), "utf8");
  } else if (meaningfulPos) {
    content = contentArg;
  } else if (json) {
    if (ttyIn) {
      console.error(
        pc.red(
          "With --json, provide note body as an argument, use --file, or pipe content on stdin.",
        ),
      );
      process.exit(1);
    }
    content = await readStdin();
  } else if (!ttyIn) {
    content = await readStdin();
  }

  let expiresAt = opts.expiresAt?.trim() || undefined;
  let password = opts.password;
  let maxViews = parseMaxViews(opts.maxViews);

  if (!json && ttyIn) {
    p.intro(pc.inverse(" getsecret "));
    const meta = await collectInteractiveMeta(opts);
    expiresAt = meta.expiresAt ?? expiresAt;
    password = meta.password ?? password;
    maxViews = meta.maxViews ?? maxViews;
  }

  if (!json && ttyIn && content === undefined) {
    const v = await p.text({
      message: "Note content (secret)",
      placeholder: "Type your note, then press Enter to create",
    });
    if (p.isCancel(v)) process.exit(0);
    content = v;
  }

  if (content === undefined) {
    console.error(
      pc.red(
        "Could not determine note content. Pass a body, use --file, pipe stdin, or run interactively in a TTY.",
      ),
    );
    process.exit(1);
  }

  const input: CreateNoteInput = {
    content,
    ...(expiresAt ? { expiresAt } : {}),
    ...(password !== undefined && password !== "" ? { password } : {}),
    ...(maxViews !== undefined ? { maxViews } : {}),
  };

  let result: CreateNoteResult;
  if (json) {
    result = await client.createNote(input);
  } else {
    const spinner = p.spinner();
    spinner.start("Creating note…");
    try {
      result = await client.createNote(input);
    } catch (e) {
      spinner.stop(pc.red("Failed to create note"));
      throw e;
    }
    spinner.stop(pc.green("Created"));
  }

  const shareUrl = buildShareUrl(webUrl, result.slug);
  const showUi = ttyOut && !json;
  if (showUi) {
    const copied = await copyUrlToClipboard(shareUrl);
    showCreateSuccessUi(shareUrl, copied);
  } else {
    printCreateJson(result, includeUrl ? shareUrl : undefined);
  }
}

async function runGet(
  slug: string,
  opts: { password?: string },
  globalOpts: GlobalOpts,
): Promise<void> {
  const json = Boolean(globalOpts.json);
  const apiUrl = resolveApiUrl(globalOpts.baseUrl);
  const client = createSecretClient({ baseUrl: apiUrl });
  const note = await client.getNote(slug, opts.password);
  if (json) {
    console.log(JSON.stringify(note, null, 2));
  } else {
    process.stdout.write(note.content);
    if (!note.content.endsWith("\n")) process.stdout.write("\n");
    if (note.attachment) {
      process.stderr.write(
        `This note includes an attachment: ${note.attachment.originalName} (${note.attachment.mimeType}). Use --json for the full response.\n`,
      );
    }
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("getsecret")
    .description("Create and read getsecret share links from the terminal.")
    .version(readPackageVersion())
    .option("--base-url <url>", "API origin (overrides GETSECRET_API_URL)")
    .option("--web-url <url>", "Website origin for share links (overrides GETSECRET_WEB_URL)")
    .option("--json", "Machine-readable JSON; no prompts, clipboard, or success UI")
    .option("--include-url", "With --json, include computed share url in output");

  program
    .command("create")
    .description("Create a secure note")
    .argument("[content]", 'Note body (optional in a TTY; use "" for interactive body)')
    .option("--expires-at <iso>", "ISO 8601 expiry")
    .option("--password <pw>", "Note password")
    .option("--max-views <n>", "Maximum number of views")
    .option("--file <path>", "Read note body from a UTF-8 file")
    .action(async function (this: Command, content: string | undefined, o: CreateCmdOpts) {
      const globalOpts = (this.parent ?? program).opts() as GlobalOpts;
      try {
        await runCreate(content, o, globalOpts);
      } catch (e) {
        if (e instanceof ApiError) {
          console.error(pc.red(e.message));
          process.exit(1);
        }
        throw e;
      }
    });

  program
    .command("get")
    .description("Fetch note content by slug")
    .argument("slug", "Note slug from the share URL")
    .option("--password <pw>", "Note password, if required")
    .action(async function (this: Command, slug: string, o: { password?: string }) {
      const globalOpts = (this.parent ?? program).opts() as GlobalOpts;
      try {
        await runGet(slug, o, globalOpts);
      } catch (e) {
        if (e instanceof ApiError) {
          console.error(pc.red(e.message));
          process.exit(1);
        }
        throw e;
      }
    });

  const argv = process.argv.slice(2);
  if (argv[0] === "--") argv.shift();
  await program.parseAsync(argv, { from: "user" });
}

main().catch((err) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
