#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { tmpDevDistDir } = require("./dev-dist-dir.cjs");

const nextDir = path.join(__dirname, "..", ".next");
fs.rmSync(nextDir, { recursive: true, force: true });
console.log("[clean-next] removed", nextDir);

const tmpDir = tmpDevDistDir();
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log("[clean-next] removed", tmpDir);
