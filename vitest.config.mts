import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      // Both extensions: the scaffolding script is .mjs, the env loader is .ts.
      "scripts/**/*.test.mjs",
      "scripts/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@clients": fileURLToPath(new URL("./clients", import.meta.url)),
    },
  },
});
