import { cp, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = resolve(rootDir, "dist");
const extensionAssets = ["manifest.json", "icons", "_locales"];

function copyExtensionAssets(): Plugin {
  return {
    name: "copy-extension-assets",
    apply: "build",
    async writeBundle() {
      await Promise.all(
        extensionAssets.map(async (asset) => {
          const from = resolve(rootDir, asset);
          const to = resolve(outDir, asset);

          if (asset.endsWith(".json")) {
            await mkdir(dirname(to), { recursive: true });
            await copyFile(from, to);
            return;
          }

          await cp(from, to, { recursive: true });
        }),
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [copyExtensionAssets()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(rootDir, "src/content.ts"),
        popup: resolve(rootDir, "popup.html"),
      },
      output: { entryFileNames: "[name].js" },
    },
  },
});
