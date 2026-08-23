# Mutabasir · The Director’s Lens

## Product Authority

| | |
|---|---|
| **Primary User** | Executives / chief engineers |
| **Job To Be Done** | Turn hours of documents into minutes of cited executive intelligence |
| **System of Record** | Extracted facts, evidence objects, executive briefs |
| **System of Intelligence** | Summaries, comparisons, decision/risk extraction |
| **Explicit Non-Goals** | Official compliance verdicts & obligations tracking (→ VERTEX) · workflow system · decision registers (→ ExecFlow) |


**Package:** `mutabasir-director-lens`
**Branch:** `mutabasir/director-lens-platform`
**Repo:** [`ahmadzayan-hub/desktop-tutorial`](https://github.com/ahmadzayan-hub/desktop-tutorial)

> From paperwork to board insight in ninety seconds. Bilingual executive
> dashboards, cited to source, powered by an on-device AI engine.

Mutabasir is a self-contained platform. It shares this repository with
other unrelated projects, so every artefact ships under distinct,
namespaced identifiers to eliminate any chance of overlap:

| Layer | Identifier |
| --- | --- |
| npm package | `mutabasir-director-lens` |
| Git branch | `mutabasir/director-lens-platform` |
| Cookie namespace | `mutabasir.*` |
| PWA scope | `/` (manifest scoped by `theme_color` and `name`) |
| Supabase schema prefix | `public.*` — table names owned exclusively by this app (`projects`, `documents`, `extracted_facts`, `briefs`, `snapshots`) |

Do **not** rebase this branch onto `main` or onto any `beyond-style-*`
or `couriers-*` branch — those are unrelated projects on the same
repository. Keep work isolated to `mutabasir/*` branches.

---

## What it does

- **Upload** — PDF, DOCX, TXT, MD in the browser (up to 25 files). Parsed
  locally via pdfjs-dist and mammoth. Nothing is uploaded to a server
  during extraction.
- **Extract** — Optional on-device AI (WebLLM / Llama 3.2 1B / Qwen 2.5
  0.5B / Phi 3.5 mini) with a deterministic baseline fallback. Every
  fact returns a confidence level and a verbatim citation.
- **Brief** — Bilingual (EN + AR) executive brief in five audience
  registers: Director, CEO, Board, Internal team, External client.
  Copy + `.md` download.
- **Publish** — Five-point quality gate, snapshot persistence, and a
  print-optimized `/projects/[id]/published` page (A4 portrait).

## Stack

- Next.js 15 App Router · React 19 · TypeScript strict
- Tailwind CSS 4 · Motion v12 · Lucide icons
- @mlc-ai/web-llm (WebGPU) · pdfjs-dist · mammoth
- Supabase Auth + Postgres + RLS (Phase 3a, optional — demo mode when
  env vars are absent)
- PWA: manifest + service worker + install prompt
- Vercel hosting

## Product surfaces

- Marketing: `/`, `/pricing`, `/faq`, `/privacy`, `/terms`
- Auth: `/sign-in`, `/sign-up`
- Workspace: `/projects`, `/projects/[id]`, `/projects/[id]/published`,
  `/new`, `/settings`
- API: `/api/health`

## Development

```bash
git switch mutabasir/director-lens-platform
npm install
cp .env.example .env.local   # fill in real keys, or leave blank for demo mode
npm run dev                  # http://localhost:3000
```

Optional Supabase persistence:

```bash
# after populating .env.local with NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL:
npm run db:apply             # applies supabase/migrations/*.sql
```

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run start       # Run production build
npm run lint        # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck   # tsc --noEmit
npm test            # Vitest — 27 tests across 4 files
npm run db:apply    # Apply Supabase migrations via pg + DATABASE_URL
```

## Verification (last green run)

- `tsc --noEmit` → 0 errors
- `next lint` → 0 warnings
- `vitest` → 27 / 27 pass
- `next build` → 17 routes, middleware 89.8 kB
- runtime smoke: `/`, `/sign-in`, `/pricing`, `/projects`, `/new`,
  `/manifest.webmanifest`, `/llms.txt`, `/favicon.svg`,
  `/apple-touch-icon.svg`, `/sw.js`, `/robots.txt`, `/sitemap.xml` all 200

---

Built by Beyond Connect General Trading L.L.C · Dubai, UAE.
