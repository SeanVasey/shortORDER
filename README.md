# shortORDER

![PWA](https://img.shields.io/badge/PWA-iOS--first-4bc2f0) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![License](https://img.shields.io/badge/license-GPL--3.0-blue) ![CI](https://img.shields.io/badge/CI-typecheck%20%7C%20test%20%7C%20build-34d0a8)

**Tell it what you want. Order up.**

shortORDER is an iOS-first mobile PWA that turns a plain-language description of an iPhone automation into a runnable Apple Shortcut. Describe what your phone should do; shortORDER compiles that request against a curated catalog of real iOS Shortcuts actions and returns one of two outputs:

1. **Direct import** — a generated, unsigned `.shortcut` file delivered through Apple's `shortcuts://import-shortcut` URL scheme.
2. **Build instructions** — precise, numbered steps to assemble the shortcut manually in the Shortcuts editor.

Every order gets an honest feasibility verdict (`native`, `partial`, or `impossible`). The app intentionally avoids silently shipping files when the graph is uncertain or unsupported.

## Product goals

- **iOS Safari and installed PWA first**: safe-area-aware layout, standalone manifest, Apple touch icon, reduced-motion handling, and explicit Home Screen onboarding.
- **Secure by default**: server-only model calls, no prompt logging, validated action graph payloads, security headers, no hardcoded secrets, and short-lived shortcut hosting.
- **Transparent output**: users always receive manual build steps, even when direct import is available.
- **Production-ready Vercel deploys**: deterministic `npm ci`, Next.js build workflow, Vercel Blob support for ephemeral shortcut files, and CI checks for type safety, tests, build, and dependency audit.

## Quick start

```sh
npm install
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000> on desktop or iPhone Safari.

## Required environment

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Server only | Calls the model from `POST /api/parse`. |
| `SHORTORDER_MODEL` | No | Server only | Overrides the default model used by the parser. |
| `BLOB_READ_WRITE_TOKEN` or `*_READ_WRITE_TOKEN` | Recommended in production | Server only | Enables Vercel Blob storage for short-lived `.shortcut` hosting. |
| `PUBLIC_BASE_URL` | Recommended in production | Server only | Forces the public origin used in `shortcuts://import-shortcut` URLs. |

Never expose these values through `NEXT_PUBLIC_*` variables.

## Scripts

```sh
npm run dev        # Start local Next.js development server
npm run typecheck  # TypeScript strict validation
npm test           # Node test suite via tsx
npm run build      # Production Next.js build
npm run audit      # Production dependency audit at moderate+ severity
npm run icons      # Regenerate PWA icon PNGs
```

## iOS/PWA behavior

- The manifest uses `display: standalone`, portrait orientation, maskable icons, and an Apple touch icon for Home Screen installs.
- The UI uses `env(safe-area-inset-*)` spacing for notched iPhones and the home indicator.
- The onboarding flow explains the Shortcuts trust gate and the Safari **Share → Add to Home Screen** install path.
- The service worker caches the app shell and static icons for resilient launches, while API requests always go to the network so generated orders are never served stale.

## Shortcut import notes

- Apple signs shortcuts on its own infrastructure. Generated files import as **untrusted** because they are created outside the Gallery.
- Users should review every action before tapping **Add Untrusted Shortcut**.
- Personal values such as contacts, addresses, playlists, or thresholds should be represented as import questions whenever possible, so the `.shortcut` file is not hardwired to private user data.
- Generated files are stored briefly and streamed from `GET /api/shortcut/[id]`; expired links return a clear 404 response.

## Vercel production deployment

1. Create/import the project in Vercel.
2. Set the environment variables above for Production and Preview.
3. Connect Vercel Blob and ensure a read-write token is available.
4. Set `PUBLIC_BASE_URL` to the canonical HTTPS production URL.
5. Deploy with the included `vercel.json` defaults (`npm ci` + `npm run build`).
6. Verify on a physical iPhone: Safari load, Add to Home Screen, first onboarding order, direct import handoff, and manual build steps.

## CI

GitHub Actions runs on pushes to `main`/`work` and on pull requests:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm audit --omit=dev --audit-level=moderate`

## Architecture

- `app/(marketing)/page.tsx` — iOS-first marketing surface and order entry.
- `app/api/parse/route.ts` — server-side model call and graph validation boundary.
- `app/api/shortcut/route.ts` — serializes validated graphs and returns Shortcuts import URLs.
- `app/api/shortcut/[id]/route.ts` — streams ephemeral `.shortcut` files.
- `lib/graph.ts` — shared graph contract and defensive normalization.
- `lib/plist.ts` — unsigned Apple Shortcut plist serializer.
- `lib/storage.ts` — Vercel Blob or local memory shortcut hosting.
- `public/manifest.json` and `public/sw.js` — PWA metadata and offline app shell.

## Security posture

- API keys remain server-side.
- User prompts and raw model output are not logged.
- Graph data from the model and client is normalized before serialization.
- Shortcut IDs are random 128-bit UUIDs without hyphens and validated before load.
- Production responses include content-type, frame, referrer, and permissions-policy hardening.
- Dependency auditing is part of local and CI verification.

## License

GPL-3.0 — see [`LICENSE`](LICENSE).
