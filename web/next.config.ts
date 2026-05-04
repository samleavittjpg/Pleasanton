import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// npm workspaces hoist `next` to the repo root. Turbopack must use the monorepo root
// (absolute path) or it can mis-infer `web/src/app` and fail to resolve `next/package.json`.
const webDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webDir, "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  // RSC / devtools fetches can fail in Safari (and some setups) when the tab is opened as
  // `localhost` but the dev server was started with `-H 127.0.0.1` (or the reverse): different
  // origins. Allow both loopback hostnames for dev-only routes.
  allowedDevOrigins: ["localhost", "127.0.0.1", "[::1]"],
};

export default nextConfig;
