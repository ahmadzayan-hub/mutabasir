# Changelog

All notable changes to the Mutabasir platform on the
`mutabasir/director-lens-platform` branch. Newest first. Commit SHAs
in parentheses.

## Unreleased — documentation pass

- **Docs:** full audit + release-readiness documentation set added
  under `docs/` per the master prompt (this commit)

## 2026-11 · mobile-first + agents + WebGPU hardening

- **`7a5bc58`** — Mobile-first shell: fixed bottom nav (Projects / New /
  Settings) with safe-area padding for iOS; edge-to-edge card layouts
  on published dashboard; header trimmed to h-14 on mobile
- **`f5f65f6`** — WebGPU compute-pipeline probe before model download;
  `VK_ERROR_UNKNOWN` (Android Vulkan) detected and cached per-device;
  bilingual friendly error explaining hardware/driver limitation
- **`658ca20`** — Seven-agent orchestrator: Technical, Contract,
  Financial, Administration, PMI, Presentation Designer, Language
  Reviewer. Deterministic — no LLM calls. Language reviewer catches
  Latin digits in Arabic, doubled words, mixed punctuation
- **`476debb`** — Self-test button in Settings; new vitest coverage
  (27 → 45 passing across 7 files); catalogue integrity test reads
  `@mlc-ai/web-llm` prebuilt list off disk
- **`606bca4`** — Silent PDF failures surface as amber chips with real
  reason ("image-only PDF (no selectable text)"); 2026 model catalogue
  refresh (7 models); elapsed timer + retry button on AI Engine card;
  Eastern-Arabic-Indic digits (٠١٢٣) in the Arabic published view
- **`25f1e47`** — SVG data visuals on published view: MetricRing donut
  (quality gate), ConfidenceBar (HIGH/MEDIUM/LOW distribution),
  presenter-mode toggle for boardroom projectors
- **`c93a2e4`** — Stop System UI freeze on constrained Android:
  default model dropped from Llama 3.2 1B to Qwen 2.5 0.5B; yield to
  browser between file parses + every 3 PDF pages; RAM guard on
  models > 500 MB when device < 4 GB; MAX_CHARS 60k → 30k

## 2026-10 · redesign + Supabase Phase 3a

- **`89da5f6`** — Settings shows real Supabase user; new OfflineBanner;
  loading skeletons on pipeline hydration; `EmptyPublished` explains
  why a snapshot might be missing (different device, private window,
  cleared storage)
- **`f74561b`** — Distinctive aperture-lens brand mark; PWA (manifest,
  service worker, install prompt); JSON-LD Organization +
  SoftwareApplication; `llms.txt` for AI answer engines; native Gulf
  Arabic register throughout
- **`d2498eb`** — Platform redesign: tabbed pipeline (Upload / Extract /
  Brief / Publish); shared `SimpleMarkdown`, `FactItem`,
  `groupFactsByCategory` primitives; `mock-store.ts` → `projects.ts`
  rename; `project-pipeline.tsx` reduced from 1178 to 330 lines
- **`b327ab5`** — Production hardening: `pg` moved to devDependencies;
  middleware catches Supabase Auth errors; `createProjectAction` surfaces
  DB failures via toast; vitest server-only shim so all 27 tests run
- **`b47bbfc`** — Phase 3a: Supabase Auth + project persistence;
  migrations, `@supabase/ssr` clients, session-refreshing middleware,
  RLS policies

## 2026-09 · Phase 2 end-to-end pipeline

- **`e43bc08`** — Upload → on-device LLM extract → executive brief →
  publish, all in-browser; two new project subjects (O&M, Construction);
  Qwen/Llama/Phi model catalogue; bilingual brief templates for 5
  audience registers; 5-point quality gate

## Format

- One line per commit. Impact-first phrasing.
- Grouped by month/theme.
- SHAs shown in backticks and linked implicitly by branch context.
