# Pleasanton Web

## Prerequisites

- Node `22.x` (required)
- npm `11.x`

The repo includes `.nvmrc` and `.node-version` pinned to `22` to keep Mac and Windows setups consistent.

## Setup

From the repository root:

```bash
npm run setup
```

`setup` installs dependencies and validates the Node major version.

## Run the Web App

From the repository root:

```bash
npm run dev
```

Open:

- `http://localhost:3000`
- or `http://127.0.0.1:3000`

Use the same hostname consistently in the browser during development to avoid dev-origin/RSC fetch issues.

## Troubleshooting Native Optional Dependencies

If you see errors about missing native bindings (`lightningcss` or `@tailwindcss/oxide`):

```bash
npm install
node web/scripts/ensure-hoisted-native-packages.cjs
rm -rf web/.next
npm run dev
```
