/**
 * npm workspaces hoist optional native packages to the repo root while
 * dependents live under web/node_modules. Next/Turbopack PostCSS then fails
 * to resolve those hoisted packages. Symlink them into web/node_modules when
 * missing (same pattern as npm bug discussion: optional deps + hoisting).
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
  fs.symlinkSync(path.relative(parent, src), dest, "dir");
}

if (process.platform !== "darwin") {
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
