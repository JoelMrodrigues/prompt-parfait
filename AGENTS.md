# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

LoL Draft Pro is a French-language League of Legends tournament draft simulator. It consists of two services:

| Service | Port | Command |
|---------|------|---------|
| Frontend (Vite + React) | 5173 | `npm run dev:client` |
| Backend (Express API) | 3001 | `npm run dev:server` |

Both start together with `npm run dev` (uses `concurrently`).

### Environment variables

A `.env` file at the project root is loaded by both frontend (Vite `VITE_*` prefix) and backend (`server/config/env.js` custom loader). The app gracefully degrades without Supabase or Riot API keys — it runs in "Mode Demo" where auth/team features are disabled but Draft and Stats pages work fully.

### Linting

- ESLint flat config (`eslint.config.js`) targets `**/*.{js,jsx}` only. All source code in `src/` is `.ts`/`.tsx`, so `npm run lint` currently only lints `scripts/*.js`. This is the existing state of the repo.
- Run: `npx eslint` (without the `src` argument to avoid the "all files ignored" error).

### Building

- `npm run build` runs Vite build. Produces output in `dist/`.

### Testing

- No automated test framework or test files exist in this codebase. Manual testing via the browser is the primary method.

### Key gotchas

- `.npmrc` sets `legacy-peer-deps=true` — required for dependency resolution.
- The `postinstall` script in `package.json` auto-installs `server/` dependencies (with `--omit=dev`), so a single `npm install` at the root installs everything.
- Server loads `.env` from multiple paths (server/.env, ./server/.env, ./.env) — the root `.env` is sufficient for both frontend and backend.
- Champion images are fetched from Riot's Data Dragon CDN at runtime; no local image files needed.
