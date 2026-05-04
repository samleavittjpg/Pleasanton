import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

function resolveRepoRoot(): string {
  const webDir = path.dirname(fileURLToPath(import.meta.url));
  const fromWebConfig = path.resolve(webDir, "..");
  if (fs.existsSync(path.join(fromWebConfig, "package-lock.json"))) {
    return fromWebConfig;
  }
  const cwd = process.cwd();
  const cwdParent = path.resolve(cwd, "..");
  for (const candidate of [cwd, cwdParent, fromWebConfig]) {
    if (fs.existsSync(path.join(candidate, "package-lock.json")) && fs.existsSync(path.join(candidate, "web", "package.json"))) {
      return candidate;
    }
  }
  return fromWebConfig;
}

// npm workspaces hoist `next` to the repo root. Turbopack must use that root (absolute path)
// or it can mis-infer `web/src/app` and fail to resolve `next/package.json`.
const repoRoot = resolveRepoRoot();

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
