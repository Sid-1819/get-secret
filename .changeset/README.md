# Changesets

Versioning and publishing for **`@getsecret/sdk`** and **`@getsecret/cli`**. Other workspace packages are private and ignored.

Releases are **manual** (no CI automation). From the repo root:

### 1. After SDK or CLI changes land on `main`

```bash
pnpm changeset
```

Select `@getsecret/sdk` and/or `@getsecret/cli`, pick semver bump (patch / minor / major), and write a short summary. Commit the new file under `.changeset/`.

### 2. When ready to release

```bash
pnpm changeset:version   # bumps package.json + CHANGELOG, removes consumed changesets
git add -A && git commit -m "chore: release"
```

### 3. Publish to npm

```bash
pnpm changeset:publish   # builds SDK + CLI, then npm publish
git push && git push --tags
```

Requires `npm login` with publish access to the `@getsecret` scope.
