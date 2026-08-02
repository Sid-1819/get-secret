# Changesets

Versioning and publishing for **`@getsecret/sdk`** only. Other workspace packages are private and ignored.

Releases are **manual** (no CI automation). From the repo root:

### 1. After a SDK change lands on `main`

```bash
pnpm changeset
```

Select `@getsecret/sdk`, pick semver bump (patch / minor / major), and write a short summary. Commit the new file under `.changeset/`.

### 2. When ready to release

```bash
pnpm changeset:version   # bumps package.json + CHANGELOG, removes consumed changesets
git add -A && git commit -m "chore(sdk): release"
```

### 3. Publish to npm

```bash
pnpm changeset:publish   # builds SDK, then npm publish
git push && git push --tags
```

Requires `npm login` with publish access to `@getsecret/sdk`.
