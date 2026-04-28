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

## Teammate Startup Runbook (Safe + Repeatable)

Use this exact flow to get up and running without merge/install conflicts.

### 1) Sync Git safely

From repo root:

```bash
git status
```

- If clean:

```bash
git pull origin main
```

- If you have local changes:

```bash
git stash push -u -m "temp-before-pull"
git pull origin main
git stash pop
```

If `stash pop` has conflicts, resolve them locally and continue.

### 2) Ensure Node 22 is active

```bash
node -v
npm run doctor
```

Expected:
- `node -v` -> `v22.x.x`
- `npm run doctor` -> `Node ... OK`

If not on Node 22:

```bash
nvm use 22
```

If `nvm` is not installed (Mac):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
```

### 3) Install dependencies

Normal install:

```bash
npm install
```

### 4) Start app

```bash
npm run dev
```

Open:
- `http://localhost:3000/create-match`

Use the same hostname consistently (`localhost` or `127.0.0.1`) during a session.

### 5) If startup fails, do a clean reinstall

```bash
rm -rf node_modules web/node_modules web/.next package-lock.json web/package-lock.json
npm cache verify
npm install
node web/scripts/ensure-hoisted-native-packages.cjs
npm run dev
```

### 6) Known issue quick fixes

- **`Cannot find module 'picocolors'`**
  - Run:
    ```bash
    npm install
    node web/scripts/ensure-hoisted-native-packages.cjs
    rm -rf web/.next
    npm run dev
    ```

- **Port 3000 already in use**
  - Run:
    ```bash
    npm run dev -w web -- -p 3002
    ```
  - Open `http://localhost:3002/create-match`

- **Dependency/audit warnings**
  - `npm audit` warnings are not always blockers for local dev.
  - Prioritize whether `npm run dev` works before force-upgrading packages.

## Copy/Paste Teammate Prompt

Use this prompt with an AI assistant (or send to a teammate) to get a reproducible startup flow:

```text
You are in the Pleasanton repo root. Please get the project running safely without breaking local changes.

Follow this exact order:
1) Check git status.
2) If working tree is clean, run: git pull origin main.
3) If not clean, run:
   git stash push -u -m "temp-before-pull"
   git pull origin main
   git stash pop
4) Ensure Node 22 is active:
   node -v
   npm run doctor
   If not 22.x, run: nvm use 22
5) Install deps:
   npm install
6) If there are missing native/hoisted package errors, run:
   node web/scripts/ensure-hoisted-native-packages.cjs
7) Clear Next cache:
   rm -rf web/.next
8) Start app:
   npm run dev
9) Open:
   http://localhost:3000/create-match

If startup fails, run clean reinstall:
rm -rf node_modules web/node_modules web/.next package-lock.json web/package-lock.json
npm cache verify
npm install
node web/scripts/ensure-hoisted-native-packages.cjs
npm run dev

Report:
- node -v
- npm run doctor result
- final dev server URL and any first error line if it fails.
```
