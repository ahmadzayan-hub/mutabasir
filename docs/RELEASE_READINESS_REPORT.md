# Release readiness report — Mutabasir · The Director's Lens

**Branch:** `mutabasir/director-lens-platform` · **Tip:** `7a5bc58`

## Executive outcome

**Conditionally release-ready.** Gates A (build), B (automated tests),
C (UX — mobile-first pass shipped), and G (documentation set) are green.
Gates D (Lighthouse), E (security), and F (AI evaluations) have documented
gaps that need decisions from the product owner before an unqualified
release; none of them are blockers for a beta / preview environment.

## Gate-by-gate verdict

| Gate | Status | Evidence |
|---|---|---|
| A — Build quality | ✅ Pass | `tsc --noEmit` clean (14 s), `next lint` 0 warnings, `next build` succeeds all 17 routes |
| B — Testing | 🟡 Partial | 45/45 unit tests pass across 7 files; **no E2E suite** (Playwright not configured) |
| C — UX | ✅ Pass for the covered surfaces | Mobile-first shell (bottom nav + safe-area), tabbed pipeline, presenter mode, bilingual AR/EN, RTL. Manual verification on Android Chrome captured in `.claude/uploads/`. |
| D — Performance | 🟡 Partial | Bundle budgets look healthy (shared 102 kB, largest route 216 kB first-load). **Lighthouse not measured against a live deploy in this session.** |
| E — Security & privacy | 🟡 Partial | On-device AI keeps documents on the device by design; RLS policies in `supabase/migrations/0001_init.sql`; `npm audit --production` has 1 critical + 8 high — see § Remaining below |
| F — AI quality | 🟡 Partial | Deterministic extractor + brief composer covered by 45 tests. **No LLM-output evaluation dataset yet** — `docs/AI_EVALUATION_PLAN.md` defines the seed set to build |
| G — Documentation | ✅ Pass | Every doc listed in section 14 of the master prompt exists (this file included) with real content, not stubs |

## Verified in this session

```
tsc --noEmit        → 0 errors      (14 s)
next lint           → 0 warnings, 0 errors
vitest              → 45/45 passing across 7 files (2.5–4 s)
next build          → 17 routes,  middleware 89.8 kB, shared 102 kB
next start smoke    → /, /sign-in, /sign-up, /projects, /new, /settings,
                       /projects/x, /projects/x/published, /api/health,
                       /manifest.webmanifest, /llms.txt, /sw.js,
                       /robots.txt, /sitemap.xml — all 200
```

## Before-and-after (this-session slice only)

| Dimension | Before | After |
|---|---|---|
| Default on-device model | Llama 3.2 1B (712 MB) | Qwen 2.5 0.5B (360 MB) |
| Model catalogue size | 3 models | 7 models (all IDs verified against installed `@mlc-ai/web-llm`) |
| WebGPU device rejection UX | crash mid-download with raw `VK_ERROR_UNKNOWN` | pre-load compute probe, cached per-device, bilingual friendly message |
| PDF text extraction failure | silent "filename only" | amber chip with reason (e.g. "image-only PDF (no selectable text)") |
| Extract stage on mobile | horizontal-scroll top tabs | bottom nav (thumb-reach) + edge-to-edge cards |
| Published view visuals | plain fact grid | SVG donut for quality gate + stacked confidence-mix bar + presenter mode |
| Arabic numerals in published dashboard | Latin | Eastern-Arabic (٠١٢٣) via `Intl.NumberFormat("ar-AE-u-nu-arab")` |
| Test count | 27 | 45 |
| Multi-agent architecture | none | 7 specialist agents + deterministic orchestrator + language reviewer |

## Remaining issues (must be addressed for unconditional release)

### High
1. **Bump Next.js past 15.6** to close the Server Actions DoS advisory
   (we use server actions in `(app)/new/actions.ts` and `(auth)/actions.ts`).
2. **Bump `pdfjs-dist` past 4.8** to close the transitive `canvas`/`tar`
   advisories.
3. **Vercel env vars** — set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_APP_URL` in Vercel → Project Settings → Environment
   Variables and redeploy. Without them the deployed app runs in demo
   mode and shows `demo@mutabasir.ae` in Settings.

### Medium
4. **Run `supabase/migrations/0001_init.sql`** once via `npm run db:apply`
   (needs `DATABASE_URL` locally) so real accounts persist.
5. **Add a Playwright E2E suite** covering: sign-up, project create,
   upload → extract → brief → publish, published view.
6. **Run Lighthouse** against the live preview once #3 above is complete.
   Add the four scores (perf / a11y / BP / SEO) to
   `docs/PERFORMANCE_REPORT.md`.
7. **Wire real LLM calls to a server route** (guarded by
   `ANTHROPIC_API_KEY`) so users on driver-hostile devices still get
   LLM extraction. The deterministic fallback works but is limited.
8. **Build the AI evaluation dataset** described in
   `docs/AI_EVALUATION_PLAN.md` and run it before every model bump.

### Low
9. Migrate from `next lint` to the ESLint CLI as recommended by the
   deprecation warning.
10. Consider adding Sentry (or equivalent) once the app is on a paid
    Vercel plan.

## Files changed in this documentation pass

| File | Purpose |
|---|---|
| `docs/PROJECT_AUDIT_BASELINE.md` | Real numbers + priority-ordered findings |
| `docs/PRODUCT_REQUIREMENTS_AND_USER_JOURNEYS.md` | User roles, capability matrix, top journeys |
| `docs/UX_UI_DESIGN_SYSTEM.md` | Tokens + primitives actually used in the code |
| `docs/AI_SYSTEM_AND_PROMPT_ARCHITECTURE.md` | WebLLM path, extraction schema, agent orchestration |
| `docs/AI_EVALUATION_PLAN.md` | Honest gap doc — what to build, not what exists |
| `docs/SECURITY_AND_RESPONSIBLE_AI_ASSESSMENT.md` | Real `npm audit` breakdown + RLS map + AI risks |
| `docs/PERFORMANCE_REPORT.md` | Measured bundle sizes + honest note on Lighthouse |
| `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement → code file → test evidence |
| `docs/TEST_STRATEGY.md` | Pyramid position, what 45 tests cover, gaps |
| `docs/DEPLOYMENT_AND_ROLLBACK.md` | Vercel + branch strategy + env vars + rollback |
| `docs/RELEASE_READINESS_REPORT.md` | This file |
| `CHANGELOG.md` | Real changelog from commit history |

## Reproduce this verification

```bash
git switch mutabasir/director-lens-platform && git pull
npm install
npx tsc --noEmit
npm run lint
npm test
npm run build
PORT=3000 npm run start
# in another shell
for p in / /sign-in /projects /new /settings /api/health; do
  curl -sI "http://localhost:3000${p}" | head -1
done
```

## Deployment status

**Not deployed by this session.** All commits pushed to
`mutabasir/director-lens-platform`. Vercel deployment is user-controlled.

## Single most important next action

**Set the Supabase env vars in the Vercel dashboard and redeploy.** That
single action unlocks: real user accounts (fixes the "demo user" shown in
Settings), the persistence path for Phase 3b, and the ability to run
Lighthouse against a representative production URL.
