import { defineConfig } from "vite"; import { resolve } from "path";
export default defineConfig({ build:{ outDir:"dist", emptyOutDir:true, rollupOptions:{ input:{ content: resolve(__dirname,"src/content.ts"), popup: resolve(__dirname,"popup.html") }, output:{ entryFileNames:"[name].js" } } } });
