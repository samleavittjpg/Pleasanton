"use strict";

const fs = require("node:fs");
const path = require("node:path");
const tsconfigPath = path.join(__dirname, "..", "tsconfig.json");
const raw = fs.readFileSync(tsconfigPath, "utf8");
const tsconfig = JSON.parse(raw);

let includes = Array.isArray(tsconfig.include) ? [...tsconfig.include] : [];

/** Only portable patterns; never commit machine-specific absolute paths. */
const required = [".pleasanton-next-dev/types/**/*.ts", ".pleasanton-next-dev/dev/types/**/*.ts"];

function dropStaleDevDistIncludes(entry) {
  const s = String(entry);
  if (s.includes("pleasanton-next-dev")) return false;
  if (/^[A-Za-z]:[\\/]/.test(s)) return false;
  if (s.startsWith("/var/") || s.startsWith("/private/var/")) return false;
  return true;
}

const nextIncludes = includes.filter(dropStaleDevDistIncludes);
let changed = includes.length !== nextIncludes.length;
includes = nextIncludes;

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
