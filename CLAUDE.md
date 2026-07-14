# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

shortORDER is an iOS-first mobile PWA that turns a plain-language description of an iPhone automation into a runnable Apple Shortcut. An LLM parses the intent into an action graph; the app either serializes it to an unsigned `.shortcut` file delivered via `shortcuts://import-shortcut` (direct path) or renders numbered assembly instructions (instruction path), based on a feasibility verdict that is always shown to the user.

## Commands

- `npm install` — install dependencies
- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build (includes type checking)
- `npm run start` — serve the production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run icons` — regenerate the PWA icon suite into `public/icons/`

- `npm test` — `node:test` suites in `tests/*.test.mjs` via `tsx` (graph validation, storage codec)

Beyond the tests, verify changes with `npm run build` plus a manual pass of the parse → serialize → fetch flow (see Architecture).

`ANTHROPIC_API_KEY` must be set for `/api/parse` (see `.env.example`). It is server-side only — never ship it client-side or log user prompts.

## Architecture

Next.js 15 App Router, TypeScript strict, Tailwind v4 plus a dedicated glass-material CSS layer.

The compiler pipeline:

1. `POST /api/parse` (`app/api/parse/route.ts`) — sends the request to Claude with a system prompt preloaded from `lib/shortcuts-actions.ts`, the **curated action dictionary**. This dictionary is the single biggest determinant of output quality: it is versioned (`DICTIONARY_VERSION` + changelog in-file), and the route demotes any graph using identifiers outside it. Returns a validated `ActionGraph` (`lib/graph.ts`).
2. `POST /api/shortcut` (`app/api/shortcut/route.ts`) — serializes the graph to an unsigned XML-plist `.shortcut` via `lib/plist.ts` (handles `attachmentsByRange` variable wiring, `GroupingIdentifier` → UUID rewriting, `WFWorkflowImportQuestions`), then picks a delivery backend via `lib/storage.ts`: Vercel Blob when a `*_READ_WRITE_TOKEN` is set; otherwise **stateless** — the gzipped plist rides inside the download URL itself, so any serverless instance can serve it with no shared storage; in-memory TTL store only for payloads too large for a URL (surfaced to the client as `storage: "memory"`). Returns the `shortcuts://import-shortcut` URL.
3. `GET /api/shortcut/[id]` (stored backends) and `GET /api/shortcut/dl?d=…` (stateless) — stream the file (must be publicly fetchable for Apple's importer; data: URIs do not work).

Variable wiring conventions between the LLM and the serializer (`{"$ref":"output"|"variable"}` objects, `{{ref:N}}` / `{{var:Name}}` string interpolation, shared `GroupingIdentifier` strings for flat control flow) are documented in `lib/graph.ts` and must stay in sync with the system prompt in `app/api/parse/route.ts`.

UI: glass primitives (`components/GlassPanel/GlassButton/GlassField`) layered per `styles/glass.css` — Safari-safe `filter:` displacement baseline, Chromium `backdrop-filter` refraction as detected enhancement. `components/Beam.tsx` is the scroll-bound 25° playhead driven by `--scroll-progress` from `lib/lenis.ts`. Design tokens (VASEY/AI palette, type) live in `app/globals.css` — do not improvise new tokens. JetBrains Mono (the canonical mono face) is self-hosted from `app/fonts/` via `next/font/local` — never reintroduce a build-time font fetch. Shared treatments (`.meta-mono`, `.pill`, `.glass-radius-*`, `.section-wash`) live in `@layer components` so single-purpose utilities can override them at call sites.

## Hard constraints

- Generated shortcuts are **unsigned** (Apple signs server-side since iOS 15); they import as untrusted and the UI must keep setting that expectation honestly.
- Never silently ship a broken shortcut: feasibility verdicts (`native`/`partial`/`impossible`) and gaps are user-facing.
- Glass is for floating chrome only; respect `prefers-reduced-motion` and `prefers-reduced-transparency`; the 25° beam angle is locked.
- License is GPL-3.0 — dependencies must be GPL-compatible.

## Conventions

- Development happens on feature branches; `main` is the default branch.
- Keep this file accurate as the codebase grows: document only commands and architecture that actually exist, and prune anything that becomes stale.
