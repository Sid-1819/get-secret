import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { build as viteBuild, defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": path.resolve(rootDir, "src"),
};

function manifestHostPermissionsPlugin(): Plugin {
  return {
    name: "manifest-host-permissions",
    closeBundle() {
      const raw = process.env.VITE_API_URL || "http://localhost:8090";
      let origin: string;
      try {
        origin = new URL(raw).origin;
      } catch {
        throw new Error(`Invalid VITE_API_URL: ${raw}`);
      }
      const manifestPath = path.join(rootDir, "dist", "manifest.json");
      const manifest = JSON.parse(
        fs.readFileSync(manifestPath, "utf8"),
      ) as { host_permissions?: string[] };
      manifest.host_permissions = [`${origin}/*`];
      fs.writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
      );
    },
  };
}

/**
 * Manifest `content_scripts` run as classic scripts — no top-level `import`.
 * Rollup code-splits shared modules into chunks; Chrome won't load those for content.
 * Emit a single IIFE after the main app bundle.
 */
function contentScriptIifePlugin(): Plugin {
  return {
    name: "content-script-iife",
    async closeBundle() {
      await viteBuild({
        configFile: false,
        root: rootDir,
        resolve: { alias },
        publicDir: false,
        build: {
          outDir: path.join(rootDir, "dist"),
          emptyOutDir: false,
          rollupOptions: {
            input: path.resolve(rootDir, "src/content/index.ts"),
            output: {
              format: "iife",
              entryFileNames: "content.js",
              inlineDynamicImports: true,
            },
          },
        },
      });
    },
  };
}

export default defineConfig({
  base: "./",
  resolve: { alias },
  plugins: [
    tailwindcss(),
    manifestHostPermissionsPlugin(),
    contentScriptIifePlugin(),
  ],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: path.resolve(rootDir, "src/background/index.ts"),
        popup: path.resolve(rootDir, "popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
