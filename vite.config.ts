import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = resolve(rootDir, "dist");

export default defineConfig({
  base: "./",
  publicDir: resolve(rootDir, "public"),
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
