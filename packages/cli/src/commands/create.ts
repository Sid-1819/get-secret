import {
  ApiError,
  createSecretClient,
  type CreateNoteInput,
} from "@getsecret/sdk";
import type { CliConfig } from "../config.js";

export type CreateCommandOptions = {
  content: string;
  maxViews?: number;
  expiresAt?: string;
  password?: string;
};

export async function runCreateCommand(
  config: CliConfig,
  options: CreateCommandOptions,
): Promise<void> {
  const client = createSecretClient({ baseUrl: config.apiUrl });

  const input: CreateNoteInput = { content: options.content };
  if (options.maxViews != null) input.maxViews = options.maxViews;
  if (options.expiresAt) input.expiresAt = options.expiresAt;
  if (options.password) input.password = options.password;

  try {
    const created = await client.createSecret(input);
    console.log(`${config.apiUrl}/s/${created.slug}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
