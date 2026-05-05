"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { tmpDevDistDir } = require("./dev-dist-dir.cjs");

const tsconfigPath = path.join(__dirname, "..", "tsconfig.json");
const raw = fs.readFileSync(tsconfigPath, "utf8");
const tsconfig = JSON.parse(raw);

const includes = Array.isArray(tsconfig.include) ? [...tsconfig.include] : [];
const distDir = tmpDevDistDir();
const required = [`${distDir}/types/**/*.ts`, `${distDir}/dev/types/**/*.ts`];

let changed = false;
for (const entry of required) {
  if (!includes.includes(entry)) {
    includes.push(entry);
    changed = true;
  }
}

if (changed) {
  tsconfig.include = includes;
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
  console.log("[sync-tsconfig-next-types] updated include with temp dist types");
}
