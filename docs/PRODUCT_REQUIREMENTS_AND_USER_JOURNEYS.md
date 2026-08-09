# Product requirements & user journeys

## Product statement

Mutabasir turns unstructured project documents (contracts, tenders, O&M
reports, construction files) into board-grade bilingual (EN + AR)
executive dashboards, with every figure cited to its source. Extraction
runs on-device via WebLLM; documents never leave the user's machine
during extraction.

## Supported project subjects (implemented)

| Subject | `Subject` enum | Extractor coverage | Sample fact types |
|---|---|---|---|
| Contract management | `contract_management` | ✅ | `contracting_parties`, `contract_value`, `term`, `payment_terms`, `governing_law`, `open_risk` |
| Tender evaluation | `tender_evaluation` | ✅ | `issuing_authority`, `evaluation_weights`, `bidder_scores`, `submission_deadline`, `recommended_award` |
| Operations & maintenance | `operations_maintenance` | ✅ | `service_contract`, `asset_inventory`, `sla_performance`, `work_order_backlog` |
| Construction | `construction` | ✅ | `project_scope`, `schedule_status`, `physical_progress`, `hse_performance` |

## User roles

| Role | Where enforced | Notes |
|---|---|---|
| Visitor (unauthenticated) | Middleware (`src/middleware.ts`) redirects `/projects`, `/new`, `/settings` → `/sign-in` when Supabase is configured | Sees marketing pages only |
| Authenticated user (owner) | Supabase Auth JWT + Postgres RLS in `0001_init.sql` | Full CRUD on own projects; can't see others' |
| Demo user | Fallback path when Supabase env vars absent | Cookie-based project store, single tenant, marked in Settings |

## Journeys covered by the code

Each journey below has the entry point, screens involved, and the
verification status (unit-tested / manual-tested / not verified).

### J1 · Land on the app and understand its purpose
- Route: `/`
- Screens: landing hero, problem statement, "how it works" (4 steps),
  outputs, features, statistics, pricing, FAQ, final CTA
- Bilingual: yes (EN + AR with RTL)
- Status: ✅ visual, unit-tested for i18n parity

### J2 · Sign up / sign in
- Route: `/sign-up`, `/sign-in`
- Supabase Auth email + password when configured; demo mode otherwise
- Middleware redirects authed users away from auth pages
- Status: ✅ builds + smoke; no E2E yet

### J3 · Create a project
- Route: `/new`
- Form: name, subject, theme, authority (EN + AR), counterparty (EN + AR),
  start/end dates
- Server action `createProjectAction` writes via `createProject()` which
  delegates to Supabase-store or cookie-store
- Status: ✅ unit-tested for pure logic (`projects.test.ts`), smoke-tested

### J4 · Upload documents
- Route: `/projects/[id]`, Upload stage
- Client-side parsers: pdfjs-dist (PDFs) + mammoth (DOCX) + File.text()
  for txt/md/csv/json
- Yield to browser every 3 PDF pages and after every file (mobile-safe)
- Parse errors surfaced as amber chips per document
- Max 25 files, 30 k chars per doc
- Status: ✅ mobile-verified from screenshots; graceful failure covered

### J5 · Download on-device AI model
- Route: `/projects/[id]`, AI Engine card
- 7 models, default = Qwen 2.5 0.5B (~360 MB)
- **Pre-download probe** compiles a trivial WGSL compute shader; if the
  driver rejects (e.g. Android Vulkan `VK_ERROR_UNKNOWN`), we don't
  waste bandwidth. Result cached per-device in localStorage.
- RAM check via `navigator.deviceMemory` with bilingual confirm dialog
  for models > 500 MB on devices < 4 GB
- Elapsed timer + retry button when the download stalls or fails
- Status: ✅ mobile-verified from screenshots; VK_ERROR_UNKNOWN classifier
  tested visually against the exact production log line

### J6 · Extract facts
- Route: `/projects/[id]`, Extract stage
- Uses loaded LLM when present, else deterministic `runMockExtraction`
  fallback (fully covered by tests)
- Facts grouped into `key_terms` / `performance` / `risk`
- Per-fact citation quote + page number + `HIGH`/`MEDIUM`/`LOW`
  confidence + user-verified toggle
- Status: ✅ mock path unit-tested for all 4 subjects; LLM path smoke-tested

### J7 · Multi-agent review
- Same route/stage
- 7 specialist agents partition the shared fact set:
  Technical / Contract / Financial / Administration / PMI /
  Presentation Designer / Language Reviewer (AR + EN)
- Deterministic — no LLM calls; each agent claims facts by
  `fact_types` list, Technical is catch-all
- Presentation Designer emits chart hints per subject
- Language Reviewer flags Latin digits in Arabic, mixed punctuation,
  doubled words
- Status: ✅ 11 dedicated agent tests

### J8 · Compose brief
- Route: `/projects/[id]`, Brief stage
- Bilingual EN + AR brief, 5 audience registers (director, ceo, board,
  internal team, external client)
- Deterministic templated composer; no LLM required
- Copy + Markdown download
- Status: ✅ unit-tested — every subject × audience × locale produces
  ≥ 30 chars

### J9 · Publish snapshot
- Route: `/projects/[id]`, Publish stage
- 5-point quality gate (documents / facts / brief / HIGH confidence / risk)
- Publishing generates a `share_token`; snapshot stored client-side
- Status: ✅ smoke-tested

### J10 · View published dashboard
- Route: `/projects/[id]/published`
- Hero cover, executive summary, quality-gate donut, confidence-mix bar,
  fact grid, snapshot footer
- Presenter mode (fullscreen scaling for boardroom projectors)
- Print-optimized (A4 portrait)
- Eastern-Arabic digits when locale is AR
- Status: ✅ smoke-tested

### J11 · Sign out
- Server action `signOutAction` clears Supabase session and revalidates
  the layout
- Status: ✅ smoke-tested

### J12 · Settings + self-test
- Route: `/settings`
- Shows real Supabase user when authenticated; demo profile otherwise
- **Run self-test** button runs the deterministic pipeline against a
  synthetic project (all 4 subjects) and reports per-check pass/fail
- Status: ✅ self-test wired to the same code paths that unit tests cover

## Journeys not yet covered

- **Public shareable dashboard** (`/p/<share_token>`) — schema function
  `snapshot_by_share_token` exists in `0001_init.sql` but no public
  route yet
- **Edit an extracted fact's payload** — only the verified-toggle works
- **Delete/archive an old snapshot** — snapshots accumulate on the client
- **Cross-project search** — not implemented
