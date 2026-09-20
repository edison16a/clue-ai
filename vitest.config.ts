import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest is configured to mirror the Next.js module graph closely enough that
 * tests import the *same* modules the app does, rather than test-only copies:
 *
 * - The `@/` alias matches the `paths` entry in tsconfig.json, so a test can
 *   `import { parseLocatorText } from "@/lib/locator"` exactly as a component
 *   would. Without it every test would need brittle relative paths.
 * - The React plugin supplies the automatic JSX runtime, which Next provides
 *   in the app but Vitest does not know about on its own.
 * - `environment: "jsdom"` is needed because the storage and theme helpers
 *   touch `window.localStorage` and `document.documentElement`.
 * - `server-only` is stubbed. The real package throws unless the bundler
 *   resolved it under Next's `react-server` condition, which is exactly the
 *   guard we want in production builds; in tests it would simply make the
 *   server modules unimportable. See tests/stubs/server-only.ts.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/**/*.tsx"],
    },
  },
});
