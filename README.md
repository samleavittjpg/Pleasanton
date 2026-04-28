# Pleasanton

Monorepo with:

- `web` (Next.js frontend)
- `server` (workspace backend scripts/services)

## Cross-Platform Development (Mac + Windows)

Use a single Node major version across all machines:

- Node `22.x` (required)
- npm `11.x`

Version hints are committed in:

- `.nvmrc`
- `.node-version`
- `package.json` `engines`

## Quick Start

```bash
npm run setup
npm run dev
```

Web app runs at `http://localhost:3000`.

If port 3000 is busy:

```bash
npm run dev -w web -- -p 3002
```

## Common Fix

If native optional dependency errors appear after switching OS or Node:

```bash
npm install
node web/scripts/ensure-hoisted-native-packages.cjs
rm -rf web/.next
npm run dev
```
