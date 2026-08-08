import { ApiError, createSecretClient } from "@getsecret/sdk";
import type { CliConfig } from "../config.js";

export type GetCommandOptions = {
  slug: string;
  password?: string;
};

export async function runGetCommand(
  config: CliConfig,
  options: GetCommandOptions,
): Promise<void> {
  const client = createSecretClient({ baseUrl: config.apiUrl });

  try {
    const result = await client.getSecret(options.slug, options.password);
    console.log(result.content);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
