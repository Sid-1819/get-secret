import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  sourcemap: true,
  treeshake: true,
  platform: "node",
  target: "node18",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node\n",
  },
  external: ["clipboardy"],
});
