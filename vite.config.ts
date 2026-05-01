import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  esbuild: {
    useDefineForClassFields: false,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "staff-roster.js",
    },
    outDir: "Koha/Plugin/Xyz/Paulderscheid/StaffRoster",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        assetFileNames: "staff-roster.[ext]",
      },
    },
    cssCodeSplit: false,
  },
});
