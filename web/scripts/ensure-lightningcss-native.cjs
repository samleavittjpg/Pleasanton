/**
 * npm workspaces often hoist lightningcss-darwin-* to the repo root while
 * lightningcss stays under web/node_modules. Turbopack/PostCSS can fail to
 * resolve the hoisted optional package. Link the platform package next to
 * lightningcss when it is missing locally.
 */
const fs = require("fs");
const path = require("path");

const key = `${process.platform}-${process.arch}`;
const pkgByKey = {
  "darwin-arm64": "lightningcss-darwin-arm64",
  "darwin-x64": "lightningcss-darwin-x64",
};

const pkg = pkgByKey[key];
if (!pkg) {
  process.exit(0);
}

const webNm = path.join(__dirname, "..", "node_modules");
const dest = path.join(webNm, pkg);
if (fs.existsSync(dest)) {
  process.exit(0);
}

const rootNm = path.join(__dirname, "..", "..", "node_modules", pkg);
if (!fs.existsSync(rootNm)) {
  console.warn(
    `[ensure-lightningcss-native] ${pkg} not found at ${rootNm}. Run npm install from the repo root.`,
  );
  process.exit(0);
}

fs.symlinkSync(path.relative(webNm, rootNm), dest, "dir");
