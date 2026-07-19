# get-secret API

Backend for **get-secret** — a secure, ephemeral secret-sharing service. Create one-time secrets with optional passphrases, expiry, view limits, and file attachments. Secrets are encrypted at rest and destroyed after use.

Public demo: [getsecret.visionly.dev](https://getsecret.visionly.dev)

## Features

- **Encrypted at rest** — AES-256-GCM via a server-side `ENCRYPTION_KEY`; plaintext is never stored.
- **Self-destructing** — Secrets expire by time (`expiresAt`) or views (`maxViews`, including burn-after-read with `maxViews: 1`).
- **Passphrase protection** — Optional bcrypt-hashed passphrases with brute-force limits.
- **File attachments** — Multipart upload with MIME validation and size limits.
- **Rate limiting** — Redis-backed limits on create and read endpoints.
- **Observability** — Prometheus metrics at `/metrics`; optional Grafana stack via Docker Compose profile.

## Tech stack

- [NestJS](https://nestjs.com/) — API framework
- [Prisma](https://www.prisma.io/) + PostgreSQL — persistence
- [Redis](https://redis.io/) — caching and rate limiting
- [Prometheus](https://prometheus.io/) — metrics

## Getting started

**Requirements:** Node.js 22+, [pnpm](https://pnpm.io/), PostgreSQL 15+, Redis 7+.

```bash
pnpm install
cp .env.example .env
```

Set `ENCRYPTION_KEY` in `.env` (required). Use a 32-byte key as hex (64 characters):

```bash
openssl rand -hex 32
```

Start Postgres and Redis locally (or use Docker Compose below), then:

```bash
pnpm run start:dev
```

The API listens on `http://localhost:3000` by default.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `ENCRYPTION_KEY` | Yes | 32-byte key (64 hex or 44 base64 chars) |
| `PUBLIC_APP_URL` | No | Base URL for secret links in API responses |
| `PORT` | No | HTTP port (default `3000`) |

See [`.env.example`](.env.example) for defaults.

## Docker Compose

Run the full stack (Postgres, Redis, API, frontend build, NGINX gateway):

```bash
docker compose up -d
```

- API gateway: `http://localhost:8090`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

Optional monitoring (Prometheus + Grafana + mtail):

```bash
docker compose --profile monitoring up -d
```

- Prometheus: `http://localhost:9091`
- Grafana: `http://localhost:3002` (default `admin` / `admin`)

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/s` | Create a secret (JSON body) |
| `POST` | `/s/multipart` | Create a secret with optional file attachment |
| `GET` | `/s/:slug` | Read a secret (increments view count; may delete when limits hit) |
| `GET` | `/metrics` | Prometheus metrics |

### Create a secret

```bash
curl -s -X POST http://localhost:3000/s \
  -H 'Content-Type: application/json' \
  -d '{"content":"hello","maxViews":1,"expiresAt":"2026-12-31T23:59:59.000Z"}'
```

Response:

```json
{
  "slug": "...",
  "url": "http://localhost:8080/s/...",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "maxViews": 1
}
```

Passphrase-protected reads use the `X-Secret-Password` header.

For a typed client and CLI, see the [SDK](../sdk/README.md).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run start:dev` | Dev server with watch |
| `pnpm run start:prod` | Production (`prisma migrate deploy` + Node) |
| `pnpm run build` | Compile TypeScript |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | End-to-end tests |
| `pnpm run lint` | ESLint |

## Deployment

**Render:** Set the start command to `pnpm run start:prod`. This runs `prisma migrate deploy` before starting the app. Ensure `DATABASE_URL` and `ENCRYPTION_KEY` are set in the service environment.

**Docker:** Build and run the production image from the included [`Dockerfile`](Dockerfile).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for shipped features, work in progress, and planned next steps (Kubernetes, Helm, security docs, structured logging, and more).

## License

Private — see repository settings.
