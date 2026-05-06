"use strict";

const path = require("node:path");

function resolveRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

/** Stable folder under `web/` (same for every clone — safe to reference from tsconfig). */
function devDistDirName() {
  return ".pleasanton-next-dev";
}

/** Absolute path to the dev dist dir (under `web/`, not system temp). System temp breaks webpack server resolution. */
function tmpDevDistDir() {
  const webRoot = path.resolve(__dirname, "..");
  return path.join(webRoot, devDistDirName());
}

module.exports = { devDistDirName, tmpDevDistDir, resolveRepoRoot };
