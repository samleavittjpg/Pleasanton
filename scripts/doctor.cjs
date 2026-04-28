#!/usr/bin/env node

const [major] = process.versions.node.split(".").map(Number);

if (major !== 22) {
  console.error(
    `[doctor] Node ${process.versions.node} detected. Please use Node 22.x for this project.`,
  );
  console.error("[doctor] Mac/Linux: nvm use 22");
  console.error("[doctor] Windows: nvm use 22 (or fnm use 22)");
  process.exit(1);
}

console.log(`[doctor] Node ${process.versions.node} OK`);
