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

`create` prints the API resource URL (e.g. `https://api.getsecret.visionly.dev/s/<slug>`). Fetch it to get JSON.

## Configuration

Priority (first wins):

1. CLI flag: `--api-url`
2. Environment: `GETSECRET_API_URL`
3. File: `~/.config/getsecret/config.json`

```json
{
  "apiUrl": "https://api.getsecret.visionly.dev"
}
```

Default matches `@getsecret/sdk` production API origin.

## Releasing

Releases use [Changesets](https://github.com/changesets/changesets) from the monorepo root. See [`.changeset/README.md`](../../.changeset/README.md).
