# GetSecret Monorepo

Ephemeral secret sharing — API, SDK, CLI, web app, and browser extension in one repository.

## Structure

```
apps/
  api/         NestJS REST API (@getsecret/api)
  web/         Marketing site, docs, playground (@getsecret/web)
  extension/   Chrome extension (@getsecret/extension)
packages/
  sdk/         TypeScript client (@getsecret/sdk)
  cli/         Terminal CLI (@getsecret/cli, binary: getsecret)
```

## Dependency graph

```
API  ←  @getsecret/sdk  ←  web | extension | CLI
```

The API returns `{ slug, expiresAt, maxViews }` — clients build share URLs with `buildShareUrl(origin, slug)`.

## Getting started

```bash
pnpm install
pnpm dev:api    # API on :3000 (or `docker compose up` in apps/api → :8090 via nginx)
pnpm dev:web    # Marketing site on :8080 (not part of docker-compose)
pnpm cli -- create "hello"  # getsecret CLI
```

### Environment

| App | Variable | Purpose |
|-----|----------|---------|
| `apps/api` | `DATABASE_URL`, `ENCRYPTION_KEY` | Backend (required) |
| `apps/api` | `REDIS_URL` | Optional — rate limits and cache; recommended for production |
| `apps/web` | `VITE_API_URL` | API origin for SDK in browser |
| `apps/extension` | `VITE_API_URL`, `VITE_WEB_URL` | API + share link origin |
| CLI | `GETSECRET_API_URL`, `GETSECRET_WEB_URL` or `~/.config/getsecret/config.json` | API + share links |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm dev:api` | Start API in watch mode |
| `pnpm dev:web` | Start Vite dev server |
| `pnpm dev:playground` | Same as `dev:web` — playground at `/playground` |
| `pnpm cli` | Run `getsecret` CLI |

## Publishing

- **SDK:** `@getsecret/sdk` via Changesets
- **CLI:** `@getsecret/cli` via Changesets (`npm install -g @getsecret/cli`)
- **API:** Docker image (`apps/api`)
- **Web:** Vercel (or static host)

## Migrated repositories

This monorepo replaces:

- `secureShare` → `apps/api`
- `secret-share` → `apps/web`
- `1-note-sdk` / `getsecret-sdk` → `packages/sdk` + `packages/cli`
- `1note-extension` → `apps/extension`

Archive the old GitHub repos and point their READMEs to this repository.
