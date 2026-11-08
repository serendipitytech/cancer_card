import { defineConfig } from "vitest/config";
import { resolve } from "path";

// WP1 scoped harness. WP2 is building the full test scaffold separately; this
// config is intentionally minimal and limited to the WP1 regression suite so the
// two merge cleanly.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/wp1-correctness/**/*.test.ts"],
    setupFiles: ["src/__tests__/wp1-correctness/setup.ts"],
    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
