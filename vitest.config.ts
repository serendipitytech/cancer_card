import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Minimal vitest harness for WP6. A fuller shared harness arrives with WP2;
// this stands up just enough to cover the notification + auction-close changes.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    // One SQLite file per run; keep files serial so the shared singleton DB
    // handle is deterministic.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
