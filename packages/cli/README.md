# `@getsecret/cli`

Terminal CLI for the GetSecret HTTP API.

## Install

```bash
npm install -g @getsecret/cli
pnpm add -g @getsecret/cli
```

Monorepo workspace:

```bash
pnpm cli -- create "hello"
```

## Usage

```bash
getsecret create "my secret"
getsecret create "one-time" --max-views 1
getsecret get <slug>
getsecret get <slug> --password "passphrase"
```

## Configuration

Priority (first wins):

1. CLI flags: `--api-url`, `--web-url`
2. Environment: `GETSECRET_API_URL`, `GETSECRET_WEB_URL`
3. File: `~/.config/getsecret/config.json`

```json
{
  "apiUrl": "https://api.getsecret.visionly.dev",
  "webUrl": "https://getsecret.visionly.dev"
}
```

Defaults match `@getsecret/sdk` production origins.

## Releasing

Releases use [Changesets](https://github.com/changesets/changesets) from the monorepo root. See [`.changeset/README.md`](../../.changeset/README.md).
