# getsecret

Secure, ephemeral secret sharing for your apps. One API to create and consume one-time secrets — for devs, backend teams, and CI. Or use the web UI to share a note in seconds with no account required.

## Features

- **Encrypted** — Notes are protected by HTTPS in transit and AES-256-GCM at rest. Plain text is never stored.
- **Self-destructing** — Notes expire after a set time or number of views.
- **Private by design** — Only the link holder (and optional passphrase) can read a note.
- **No signup** — Create and share without an account.
- **API-first** — REST API for creating and consuming secrets from your apps.

## How it works

1. **Write a note** — Paste or type your secret.
2. **Share the link** — Get a unique link and send it to the recipient.
3. **Gone after viewing** — The note appears once, then is destroyed.

## Tech stack

- [Vite](https://vitejs.dev/) — Build tool
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [React Router](https://reactrouter.com/) — Routing
- [TanStack Query](https://tanstack.com/query) — Data fetching
- [Framer Motion](https://www.framer.com/motion/) — Animations

## Getting started

**Requirements:** Node.js 18+ and [pnpm](https://pnpm.io/) 11 (via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable && corepack prepare pnpm@11.5.1 --activate`).

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Backend / API

The app expects a backend API. Set `VITE_API_URL` to your API base URL (e.g. in `.env`):

```env
VITE_API_URL=https://api.getsecret.visionly.dev
```

For local dev, leave `VITE_API_URL` empty and use the Vite proxy (`/s` → `http://localhost:8090`).

If unset, requests go to the same origin (relative URLs).

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `pnpm dev`     | Start dev server with HMR      |
| `pnpm build`   | Production build               |
| `pnpm preview` | Preview production build       |
| `pnpm lint`    | Run ESLint                     |
| `pnpm test`    | Run tests (Vitest)             |

## Project structure

- `src/pages/` — Route pages (Index, Features, Docs, Security, Roadmap, ViewNote)
- `src/components/` — Reusable UI (Navbar, Footer, NoteForm) and shadcn components
- `src/lib/` — API client (`api.ts`), utilities
- `/s/:slug` — View a shared note (one-time reveal)

## License

Private — see repository settings.
