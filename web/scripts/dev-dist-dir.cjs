"use strict";

const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");

function resolveRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function tmpDevDistDir() {
  const repoRoot = resolveRepoRoot();
  const hash = crypto.createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
  return path.join(os.tmpdir(), `pleasanton-next-dev-${hash}`);
}

module.exports = { tmpDevDistDir };
