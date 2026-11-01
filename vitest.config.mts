import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` throws at import time when pulled into a client
      // bundle. Test files import server-only modules directly to verify
      // their pure-logic exports, so stub it out under vitest.
      "server-only": path.resolve(__dirname, "./vitest.shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
});
