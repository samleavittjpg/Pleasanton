import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const { tmpDevDistDir } = require("./scripts/dev-dist-dir.cjs") as { tmpDevDistDir: () => string };

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
const useTempDistForDev = process.env.NEXT_DEV_DIST_TMP === "1";

const nextConfig: NextConfig = {
  ...(useTempDistForDev ? { distDir: tmpDevDistDir() } : {}),
  // Turbopack’s on-disk cache (.sst under `.next`) can fail with ENOENT on some
  // machines (sync tools, partial deletes). Dev works fine without persisting it.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    root: repoRoot,
  },
  // RSC / devtools fetches can fail in Safari (and some setups) when the tab is opened as
  // `localhost` but the dev server was started with `-H 127.0.0.1` (or the reverse): different
  // origins. Allow both loopback hostnames for dev-only routes.
  allowedDevOrigins: ["localhost", "127.0.0.1", "[::1]"],
  // Webpack’s default dev cache writes under `.next/dev/cache/webpack/…` and renames `*.pack.gz_`
  // → `*.pack.gz`. iCloud (or other sync) on `Documents/` can delete or lock those paths mid-write,
  // which then cascades into missing routes-manifest and compiled `page.js` under `.next/dev/`.
  // Memory cache avoids that disk layer; first compile is a bit slower, dev is stable.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
