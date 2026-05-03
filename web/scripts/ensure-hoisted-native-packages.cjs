/**
 * npm workspaces hoist optional native packages to the repo root while
 * dependents live under web/node_modules. Next/Turbopack's PostCSS bundle
 * often cannot resolve hoisted or symlinked optional packages.
 *
 * 1) Symlink platform packages into web/node_modules (plain Node resolution).
 * 2) Copy the .node binary next to the package that does `require('./…node')`
 *    so Turbopack-relative loads succeed.
 */
const fs = require("fs");
const path = require("path");

function packageDir(base, name) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return path.join(base, scope, pkg);
  }
  return path.join(base, name);
}

function resolvePkgDir(pkg) {
  const webNm = path.join(__dirname, "..", "node_modules");
  const rootNm = path.join(__dirname, "..", "..", "node_modules");
  for (const base of [webNm, rootNm]) {
    const d = packageDir(base, pkg);
    try {
      if (fs.existsSync(d)) {
        return fs.realpathSync(d);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function ensureSymlink(pkg) {
  const webNm = path.join(__dirname, "..", "node_modules");
  const rootNm = path.join(__dirname, "..", "..", "node_modules");
  const dest = packageDir(webNm, pkg);
  const src = packageDir(rootNm, pkg);

  if (fs.existsSync(dest)) {
    return;
  }
  if (!fs.existsSync(src)) {
    console.warn(
      `[ensure-hoisted-native-packages] ${pkg} missing at ${src}. Run npm install from the repo root.`,
    );
    return;
  }

  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  try {
    fs.symlinkSync(path.relative(parent, src), dest, "dir");
  } catch (err) {
    // On Windows, creating symlinks often requires Developer Mode or elevation.
    // Fall back to a copy so local dev can proceed in locked-down environments.
    if (
      process.platform === "win32" &&
      err &&
      (err.code === "EPERM" || err.code === "UNKNOWN")
    ) {
      fs.cpSync(src, dest, { recursive: true });
      return;
    }
    throw err;
  }
}

function copyFileIfPresent(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function ensureTailwindOxideNativeBlob() {
  if (process.platform !== "darwin") {
    return;
  }
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const pkg = `@tailwindcss/oxide-darwin-${arch}`;
  const fileName = `tailwindcss-oxide.darwin-${arch}.node`;
  const srcDir = resolvePkgDir(pkg);
  if (!srcDir) {
    console.warn(
      `[ensure-hoisted-native-packages] ${pkg} not found; run npm install from the repo root.`,
    );
    return;
  }
  const src = path.join(srcDir, fileName);
  const webNm = path.join(__dirname, "..", "node_modules");
  const dest = path.join(webNm, "@tailwindcss", "oxide", fileName);
  if (!copyFileIfPresent(src, dest)) {
    console.warn(`[ensure-hoisted-native-packages] missing ${src}`);
  }
}

function ensureLightningcssNativeBlob() {
  if (process.platform !== "darwin") {
    return;
  }
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const pkg = `lightningcss-darwin-${arch}`;
  const fileName = `lightningcss.darwin-${arch}.node`;
  const srcDir = resolvePkgDir(pkg);
  if (!srcDir) {
    console.warn(
      `[ensure-hoisted-native-packages] ${pkg} not found; run npm install from the repo root.`,
    );
    return;
  }
  const src = path.join(srcDir, fileName);
  const webNm = path.join(__dirname, "..", "node_modules");
  const dest = path.join(webNm, "lightningcss", fileName);
  if (!copyFileIfPresent(src, dest)) {
    console.warn(`[ensure-hoisted-native-packages] missing ${src}`);
  }
}

if (process.platform !== "darwin") {
  // Still link plain JS packages that Turbopack/PostCSS may fail to resolve when hoisted.
  ensureSymlink("picocolors");
  process.exit(0);
}

const archPkgs =
  process.arch === "arm64"
    ? ["lightningcss-darwin-arm64", "@tailwindcss/oxide-darwin-arm64"]
    : process.arch === "x64"
      ? ["lightningcss-darwin-x64", "@tailwindcss/oxide-darwin-x64"]
      : [];

for (const pkg of archPkgs) {
  ensureSymlink(pkg);
}
ensureSymlink("picocolors");

ensureTailwindOxideNativeBlob();
ensureLightningcssNativeBlob();
