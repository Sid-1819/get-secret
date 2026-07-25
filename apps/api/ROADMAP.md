# Roadmap

What we have shipped, what we are building next, and where the project is headed.

Status legend: ✅ shipped · 🚧 in progress · 📋 planned

---

## Foundation (v1.0)

- ✅ Build a secure, reliable one-time secret sharing application.
- ✅ Replace the NestJS starter with a polished project (README, docs, branding).
- ✅ Ship Docker Compose deployment.
- ✅ Launch a public demo (evaluation only).

---

## Self-Hosting

- 🚧 One-command Docker deployment.
- 📋 Kubernetes manifests.
- 📋 Helm Chart.
- 🚧 Reverse proxy examples (NGINX, Traefik, Caddy).

> **Today:** `docker compose up -d` runs Postgres, Redis, the API, a built frontend, and NGINX. Standalone reverse-proxy recipes for Traefik and Caddy are planned.

---

## Security

- ✅ Strong encryption and secure secret lifecycle (AES-256-GCM at rest, HTTPS in transit).
- ✅ Configurable expiry and burn-after-read (`expiresAt`, `maxViews`, soft-delete after limit).
- ✅ Rate limiting, validation, and security hardening (Redis-backed limits, DTO validation, passphrase protection).
- 📋 Publish a security model and threat model.

---

## Production Readiness

- ✅ Prometheus metrics (`/metrics` — secret create/read counters, rate-limit stats).
- ✅ Health checks (container healthcheck against `/metrics`).
- 📋 Structured logging (JSON logs with request correlation).
- 📋 Backup and upgrade documentation.

> **Today:** Optional monitoring stack via `docker compose --profile monitoring up -d` (Prometheus, Grafana, mtail).

---

## Developer Experience

- 🚧 Excellent documentation.
- ✅ REST API (`POST /s`, `POST /s/multipart`, `GET /s/:slug`).
- ✅ CLI (see [SDK](../sdk/README.md)).
- 🚧 Comprehensive test suite (unit tests for encryption and secrets; e2e coverage expanding).
- 📋 Easy contribution guide.

---

## Open Source

- 📋 Publish versioned releases.
- 📋 Maintain a changelog.
- 📋 Good first issues.
- 📋 Build an active contributor community.

---