# @getsecret/sdk

## 2.0.1

### Patch Changes

- fixed attachment files

## 2.0.0

### Major Changes

- Monorepo migration: package renamed to `@getsecret/sdk`.
- **Breaking:** `CreateNoteResult` no longer includes `url`. Use `buildShareUrl(webOrigin, slug)` to construct share links client-side.
- Removed `SECRET_API_URL` env resolution from SDK; callers must pass `baseUrl` or rely on the documented default API origin.
- CLI moved to separate `getsecret` package.
- Added `createSecret` / `getSecret` aliases and `CreateSecretInput` / `CreateSecretResult` types.

## 1.0.0

- Initial release as `getsecret-sdk`.
