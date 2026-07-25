# getsecret CLI

Terminal client for GetSecret. Depends on `@getsecret/sdk`.

## Install

```bash
npm install -g getsecret
```

Monorepo:

```bash
pnpm cli -- create "hello world"
```

## Configuration

Resolution order:

1. Flags: `--base-url`, `--web-url`
2. Environment: `GETSECRET_API_URL`, `GETSECRET_WEB_URL`
3. Config file: `~/.config/getsecret/config.json`

```json
{
  "apiUrl": "https://api.getsecret.visionly.dev",
  "webUrl": "https://getsecret.visionly.dev"
}
```

## Commands

```bash
getsecret create "secret text"
getsecret get <slug>
getsecret create --json --include-url "secret"   # JSON includes computed share URL
```
