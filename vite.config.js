import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * public/sw.js is copied verbatim, so stamp the build id into the copy that
 * ships. A changed service worker script is what makes the browser notice a
 * new deploy at all.
 */
function serviceWorkerBuildId() {
  return {
    name: "sw-build-id",
    apply: "build",
    closeBundle() {
      const outFile = resolve(process.cwd(), "dist/sw.js");
      const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      writeFileSync(outFile, readFileSync(outFile, "utf8").replaceAll("__BUILD_ID__", buildId));
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "./",
  plugins: [react(), serviceWorkerBuildId()],
  build: {
    sourcemap: true,
  },
});
