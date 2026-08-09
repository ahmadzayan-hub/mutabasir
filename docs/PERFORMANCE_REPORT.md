# Performance report

**Honesty note:** Lighthouse was **not** run against a live deployment
in this session. Every number below is either measured directly with
`next build` or is a static analysis. When you deploy from
`mutabasir/director-lens-platform` and Lighthouse against the preview,
please paste the four scores back into this file.

## Bundle sizes — measured by `next build`

| Route | Route JS | First Load JS |
|---|---|---|
| `/` (landing) | 9.77 kB | 183 kB |
| `/_not-found` | 138 B | 103 kB |
| `/api/health` | 138 B | 103 kB |
| `/faq` | 1.29 kB | 175 kB |
| `/new` | 5.13 kB | 176 kB |
| `/opengraph-image` | 138 B | 103 kB |
| `/pricing` | 2.44 kB | 175 kB |
| `/privacy` | 3.8 kB | 177 kB |
| `/projects` | 4.34 kB | 179 kB |
| **`/projects/[id]`** | **21.1 kB** | **216 kB** |
| **`/projects/[id]/published`** | **6.12 kB** | **186 kB** |
| `/robots.txt` | 139 B | 102 kB |
| `/settings` | 4.28 kB | 189 kB |
| `/sign-in` | 1.96 kB | 170 kB |
| `/sign-up` | 1.87 kB | 170 kB |
| `/sitemap.xml` | 139 B | 102 kB |
| `/terms` | 3.8 kB | 177 kB |
| Shared JS (all routes) | — | **102 kB** |
| Middleware | — | **89.8 kB** |

## Budget vs actual

| Budget | Target | Actual | Verdict |
|---|---|---|---|
| Shared first-load JS | ≤ 120 kB | 102 kB | ✅ |
| Heaviest single-page first-load | ≤ 250 kB | 216 kB | ✅ |
| Middleware size | ≤ 100 kB | 89.8 kB | ✅ |
| Landing route JS | ≤ 15 kB | 9.77 kB | ✅ |
| Marketing footprint (all static routes) | ≤ 200 kB first-load | max 183 kB | ✅ |

## Deliberate weight

- **`/projects/[id]` = 21.1 kB** — carries the four pipeline sub-
  components (upload/AI/extract/brief/publish), the multi-agent panel,
  motion transitions, and the pipeline store. `@mlc-ai/web-llm` and
  `pdfjs-dist` are **not** in this budget — they're dynamic-imported
  when the user actually taps "Download AI model" / uploads a PDF, so
  first-load isn't paying for them.
- **`/settings` = 4.28 kB** — includes the self-test panel which
  re-uses the pipeline modules; still under budget.

## Performance techniques already applied

| Technique | Where |
|---|---|
| Route-level code splitting | Next.js App Router by default |
| Dynamic `import()` for heavy libs | `@mlc-ai/web-llm`, `pdfjs-dist`, `mammoth` — loaded only on demand |
| Main-thread yielding | `yieldToBrowser()` between file parses and every 3 PDF pages (`src/lib/utils/yield.ts`) |
| Mobile-first defaults | Qwen 0.5B (~360 MB) instead of Llama 1B (~712 MB) as the default model |
| RAM guard | `hasEnoughRamForLargeModel(4)` blocks > 500 MB downloads on < 4 GB devices |
| WebGPU probe | Cheap compute-pipeline probe before starting the 360 MB weight download |
| Text cap per document | `MAX_CHARS = 30_000` — bounded React state size on mobile |
| CDN worker for pdfjs | `cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs` (Web Worker, off main thread) |
| Font loading | Dubai via `@import` with implicit `display=swap`; also declared in `layout.tsx` via `link rel="preconnect"` |
| Service worker | Precaches app shell (`public/sw.js`) — installable PWA |
| Server components by default | Only interactive surfaces are `"use client"` |
| Tabular numerals | `.num` class with `font-variant-numeric: tabular-nums` prevents shift on number changes |

## Not applied

- **Image optimisation for user uploads.** None — we don't render user
  images. All visuals are inline SVG or dynamic-imported.
- **React Server Components streaming.** Basic RSC used but no
  Suspense-boundary streaming yet.
- **Prefetch on hover for pipeline routes.** Next.js's Link prefetches
  visible links but not internal-hover.
- **Compression at edge.** Vercel default (Brotli) — no custom config.

## Recommended next measurements (require live deploy)

1. `npx lighthouse https://<preview>.vercel.app/ --preset=desktop`
2. `npx lighthouse https://<preview>.vercel.app/ --form-factor=mobile --preset=perf`
3. Chrome DevTools → Performance → record a full extract flow on a real
   phone; look for long tasks > 50 ms
4. WebPageTest run to see TTFB from Middle East regions (target: UAE)
