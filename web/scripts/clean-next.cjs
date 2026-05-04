#!/usr/bin/env node
/**
 * Removes web/.next so the next dev server can regenerate manifests
 * (routes-manifest.json, middleware-manifest.json, etc.).
 */
const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(__dirname, "..", ".next");
fs.rmSync(nextDir, { recursive: true, force: true });
console.log("[clean-next] removed", nextDir);
