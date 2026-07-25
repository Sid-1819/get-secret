# `@getsecret/sdk`

TypeScript client for the GetSecret HTTP API.

## Install

```bash
npm install @getsecret/sdk
pnpm add @getsecret/sdk
```

Monorepo workspace:

```json
{
  "dependencies": {
    "@getsecret/sdk": "workspace:*"
  }
}
```

## Usage

```ts
import { createSecretClient, buildShareUrl } from "@getsecret/sdk";

const client = createSecretClient({
  baseUrl: "https://api.getsecret.visionly.dev",
});

const created = await client.createSecret({
  content: "my secret",
  maxViews: 1,
});

const shareUrl = buildShareUrl("https://getsecret.visionly.dev", created.slug);
const note = await client.getSecret(created.slug);
```

Browser apps should pass `baseUrl` from `import.meta.env.VITE_API_URL`. Same-origin dev can use `baseUrl: ""`.

## CLI

Install the separate `getsecret` package for terminal usage:

```bash
npm install -g getsecret
getsecret create "hello"
```

## API contract

Create responses: `{ slug, expiresAt, maxViews }` — no share URL. Build links client-side with `buildShareUrl(webOrigin, slug)`.

## Legacy names

`createNote` / `getNote` and `CreateNoteInput` remain as aliases for `createSecret` / `getSecret`.
