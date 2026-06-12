# shortORDER

**Tell it what you want. Order up.**

shortORDER is an iOS-first mobile PWA that turns a plain-language description of an iPhone automation into a runnable Apple Shortcut. Describe what your phone should do; the request is compiled against a curated catalog of real iOS Shortcuts actions and comes back one of two ways:

1. **Direct import** — a generated, unsigned `.shortcut` file delivered via the `shortcuts://import-shortcut` URL scheme.
2. **Build instructions** — precise, numbered steps to assemble the shortcut by hand.

Every order gets an honest feasibility verdict (`NATIVE` / `PARTIAL` / `IMPOSSIBLE`) — shortORDER never silently ships a broken shortcut.

## Quick start

```sh
npm install
cp .env.example .env   # set ANTHROPIC_API_KEY
npm run dev            # http://localhost:3000
```

## Notes on the platform

- Apple signs shortcuts on its own infrastructure since iOS 15, so generated files import as **untrusted**. Users flip *Settings → Shortcuts → Allow Untrusted Shortcuts* once (iOS hides the toggle until one Gallery shortcut has been run). The build-instructions path needs none of this.
- The `.shortcut` file must be publicly fetchable for Apple's importer; files are hosted ephemerally (Vercel Blob when configured, in-memory TTL store otherwise) and streamed from `GET /api/shortcut/[id]`.
- Personal values (contacts, playlists, thresholds) are wired as `WFWorkflowImportQuestions` so the shortcut asks at install time instead of hardcoding.

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 + a dedicated liquid-glass CSS layer · Anthropic API (server-side only) · Lenis · PWA (manifest + service worker).

See `CLAUDE.md` for architecture details and development commands.

## License

GPL-3.0 — see `LICENSE`.
