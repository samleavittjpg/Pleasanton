const path = require("node:path");

/**
 * Returns a dev-only dist dir name under `web/.next/`.
 * Keeping this inside the workspace avoids resolution issues with hoisted deps.
 */
function devDistDirName() {
  return path.join(".next", "dev");
}

module.exports = { devDistDirName };

