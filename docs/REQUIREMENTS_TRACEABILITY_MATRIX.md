# Requirements traceability matrix

Every requirement → code module → test evidence. Only entries with real
files are listed; aspirational features are marked in the Notes column.

| Requirement | Code | Test | Notes |
|---|---|---|---|
| Extract structured facts from PDF/DOCX/text | `src/lib/parsers/document-text.ts` | — | pdfjs-dist + mammoth, tests deferred to E2E |
| Extraction fails gracefully on corrupt PDF | `src/lib/parsers/document-text.ts` `try/catch` returning `{ error }` | — | verified via mobile screenshot regression |
| Do not upload documents to a server | `src/app/(app)/projects/[id]/project-pipeline.tsx` — all processing client-side | — | privacy contract; enforced by absence of upload code |
| Bilingual EN + AR briefs | `src/lib/brief/composer.ts` | `src/lib/extraction/pipeline.test.ts` — every subject × audience × locale | 4 × 5 × 2 = 40 combinations |
| Cited facts (quote + page) | `src/lib/extraction/llm-extractor.ts` — prompt requires them, coercer preserves them | `src/lib/agents/agents.test.ts` — orchestrator partition test uses cited facts | Live citation is on the UI |
| Five confidence levels reduced to HIGH/MEDIUM/LOW | `src/types/database.ts` `Confidence` enum | Every fact-producing test | Deterministic default = MEDIUM |
| 5-point quality gate | `src/app/(app)/projects/[id]/_pipeline/publish-card.tsx` `QualitySummary` | Manual verification (visible in UI) | documents / facts / brief / HIGH / risk |
| Traffic-light status only (no blue) | `src/app/globals.css` tokens + audit | `src/lib/i18n/dictionary.test.ts` (no em-dash rule; no blue rule not machine-checked) | Rule stated in README; violations grep-visible |
| RTL support | `src/app/(app)/_shell/app-shell.tsx` `dir={dir}` + logical Tailwind classes | Manual verification | Confirmed on Android Chrome |
| Eastern-Arabic digits in Arabic mode | `src/lib/utils/numbers.ts` `formatNumber("ar-AE-u-nu-arab")` | `src/lib/extraction/pipeline.test.ts` — numeral test | Used in `MetricRing`, published footer |
| Row-level security on all tables | `supabase/migrations/0001_init.sql` policies | — | Verified by inspection; requires live Supabase to run |
| Owner-only project CRUD | `src/lib/store/supabase-store.ts` — filtered by `auth.uid()` via RLS | `src/lib/store/projects.test.ts` (pure logic only) | Auth-guarded by `middleware.ts` |
| Public share via token only | `snapshot_by_share_token(text)` SQL function, `SECURITY DEFINER`, filters `published = true` | — | Public route not built yet (Phase 3b) |
| On-device AI (no server LLM required) | `src/lib/llm/web-llm.ts` — WebLLM via WebGPU | `src/lib/llm/web-llm.test.ts` — catalogue integrity | Deterministic fallback when unavailable |
| WebGPU driver-bug detection | `probeWebGpuCompute()` + `classifyProbeError()` | — | Verified against the exact `VK_ERROR_UNKNOWN` line captured on Android |
| Mobile-first nav (thumb-reach) | `src/app/(app)/_shell/app-shell.tsx` — bottom nav with safe-area padding | Manual | Hidden ≥ sm |
| PWA installable | `public/manifest.webmanifest` + `public/sw.js` + `src/components/pwa/install-prompt.tsx` | Manual | Precaches app shell |
| Offline indicator | `src/components/pwa/offline-banner.tsx` | Manual | Fixed top bar on `!navigator.onLine` |
| SEO metadata | `src/app/layout.tsx` + per-route `metadata` | — | JSON-LD Organization + SoftwareApplication in root layout |
| hreflang alternates | `src/components/Seo.tsx` (Lahza only) / Mutabasir uses `metadata.alternates.languages` in `src/app/layout.tsx` | — | Emitted per route |
| Sitemap + robots + llms.txt | `src/app/sitemap.ts`, `src/app/robots.ts`, `public/llms.txt` | Runtime smoke | Route responses: 200 |
| Multi-agent architecture | `src/lib/agents/*` | `src/lib/agents/agents.test.ts` — 11 tests | Deterministic; no LLM calls |
| Language reviewer catches AR/EN issues | `src/lib/agents/language-reviewer.ts` | `src/lib/agents/agents.test.ts` — 5 language-check tests | Latin digits in AR, doubled words, mixed punctuation, etc. |
| Self-test button (user-runnable in-app) | `src/app/(app)/settings/self-test-panel.tsx` + `src/lib/self-test/runner.ts` | Same code paths as unit tests | 7 checks per run |
| Real user info shown in Settings | `src/app/(app)/settings/page.tsx` — reads `getServerUser()` | — | Falls back to demo profile when Supabase absent |
| Elapsed timer + retry during model load | `src/app/(app)/projects/[id]/_pipeline/ai-engine-card.tsx` | Manual | Timer runs `setInterval`; retry button appears on `error` status |

## Gaps (requirement present, code missing)

| Requirement | Status | Recommended next step |
|---|---|---|
| Public `/p/<share_token>` route | schema exists, no route | Add `src/app/p/[token]/page.tsx` calling the RPC function |
| Documents persisted to Supabase Storage | not implemented | Add `documents.storage_path` write path in a new server action |
| Facts / briefs / snapshots persist server-side | not implemented | Extend `supabase-store.ts` with `sbCreateFact` etc.; migrate localStorage to seed the initial state |
| Playwright E2E suite | not present | Cover J2 (sign-up), J4 (upload), J6 (extract), J10 (published) |
| CI running lint + tests + build on push | not present | Add `.github/workflows/ci.yml` |
| Sentry / error monitoring | not present | Add on paid plan |
| Rate limiting on server actions | not present | Vercel WAF or upstash-ratelimit |
