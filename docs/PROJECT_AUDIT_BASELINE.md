# Project audit baseline — Mutabasir · The Director's Lens

**Captured:** on branch `mutabasir/director-lens-platform`, tip `7a5bc58`.
**Command evidence:** every number below is the direct output of a command
run in this session, not an estimate.

## Repository shape

| Metric | Value | How measured |
|---|---|---|
| Source files (`.ts` + `.tsx`) | 119 | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) \| wc -l` |
| Source lines | 12,511 | same, piped to `cat \| wc -l` |
| Test files | 7 | vitest reporter output |
| Tests passing | 45 / 45 | `npm test` |
| App Router routes | 17 | `next build` output |
| Middleware size | 89.8 kB | `next build` |
| Shared first-load JS | 102 kB | `next build` |
| Heaviest route (`/projects/[id]`) | 21.1 kB · first-load 216 kB | `next build` |
| Published view (`/projects/[id]/published`) | 6.12 kB · first-load 186 kB | `next build` |

## Baseline gates — as of this commit

| Gate | Result | Command |
|---|---|---|
| A · Build quality — `tsc --noEmit` | **clean** (0 errors, 14 s) | `npx tsc --noEmit` |
| A · Build quality — `next lint` | **0 warnings, 0 errors** | `npm run lint` |
| A · Production build | **succeeds**, 17 routes | `npm run build` |
| B · Automated tests | **45 / 45 pass** across 7 files | `npm test` |
| B · Runtime smoke on public + auth routes | **200 on every route sampled** | `next start` + curl loop |
| E · `npm audit --production` | **1 critical / 8 high / 1 moderate** — all transitive; see § Security below | `npm audit --production` |
| C · Manual mobile flow verification | **partial** — only Android Chrome (from user screenshots) | photos in `.claude/uploads/` |
| D · Lighthouse Performance/A11y/BP/SEO | **NOT MEASURED** in this session | run locally: `npx lighthouse …` |
| F · AI evaluation suite | **NOT DEFINED** — mock extraction is unit-tested; LLM extraction has no eval dataset | see `docs/AI_EVALUATION_PLAN.md` |
| G · Documentation set | this pass fills the required set | — |

## Security · `npm audit --production` — real breakdown

| Severity | Package | Range | Root cause |
|---|---|---|---|
| **Critical** | `tar` | ≤ 7.5.20 | Hardlink path-traversal; transitive via `canvas` → `pdfjs-dist` (build tooling) |
| High | `next` | 9.3.4-canary.0 – 16.3.0-preview.10 | DoS in App Router Server Actions — **affects us** (15.5.18) |
| High | `pdfjs-dist` | 3.0.279 – 4.7.76 | Transitive `canvas` vulnerability |
| High | `sharp` | < 0.35.0 | libvips CVEs — Next.js image optimiser |
| High | `postcss` | ≤ 8.5.22 | XSS via unescaped `</style>` in Stringify output — only affects untrusted-CSS input |
| High | `nanoid` | ≤ 3.3.16 | Non-secure generators loop on negative size (upstream in Next) |
| High | `canvas` | 2.8.0 – 2.11.2 | `@mapbox/node-pre-gyp` transitive |
| High | `brace-expansion` | ≤ 1.1.17 | DoS via exponential expansion |
| High | `@mapbox/node-pre-gyp` | ≤ 1.0.11 | Transitive `tar` |
| Moderate | (rolled into above) | — | — |

**Mitigation status:** the two that materially affect this app are Next.js
(Server Actions DoS) and pdfjs-dist. Both are patched upstream in Next 15.6+
and pdfjs 4.8+. Recommended: bump `next` and `pdfjs-dist` in a dedicated
maintenance PR; see release-readiness report for the recommendation.

## Product surfaces (as they exist on `mutabasir/director-lens-platform`)

| Surface | Route(s) | Rendering |
|---|---|---|
| Marketing landing | `/` | Static, prerendered |
| Marketing subpages | `/pricing`, `/faq`, `/privacy`, `/terms` | Static |
| Auth | `/sign-in`, `/sign-up` | Static shell + server actions |
| Workspace: projects list | `/projects` | Dynamic |
| Workspace: project detail | `/projects/[id]` | Dynamic |
| Workspace: published dashboard | `/projects/[id]/published` | Dynamic (client-side hydrate) |
| Workspace: create | `/new` | Dynamic |
| Workspace: settings + self-test | `/settings` | Dynamic (server-fetches user) |
| Ops | `/api/health` | Dynamic API route |
| SEO/PWA infra | `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/manifest.webmanifest`, `/sw.js`, `/llms.txt` | Static + one edge OG route |

## Findings — priority-ordered

### Critical (P0)
None currently open. The previously-observed Android "System UI isn't responding"
crash was traced to a driver-level Vulkan rejection in on-device WebLLM and
mitigated by (a) making Qwen 2.5 0.5B the default (down from Llama 3.2 1B),
(b) yielding to the browser between file parses and every 3 PDF pages,
(c) capping parsed text at 30 k chars/doc, and (d) probing the compute
pipeline before initiating the model download. Commit `f5f65f6`.

### High (P1)
1. **Next.js DoS advisory (Server Actions).** We use server actions in
   `(app)/new/actions.ts` and `(auth)/actions.ts`. Recommend bumping Next
   to 15.6+ in a maintenance PR.
2. **Vercel deployment shows demo user.** `demo@mutabasir.ae` appears in
   Settings because `NEXT_PUBLIC_SUPABASE_*` env vars are not set in the
   Vercel project. Code path is intentional (demo mode fallback) — this
   is a deployment-config gap, not a bug.
3. **Documents / facts / briefs / snapshots persist in localStorage only.**
   Phase 3b (Supabase persistence for pipeline artefacts + public
   `/p/<share_token>`) is intentionally deferred — schema is in
   `supabase/migrations/0001_init.sql`.

### Medium (P2)
4. **No E2E test coverage.** Vitest covers pure logic (extractor, brief
   composer, agents, language reviewer, model catalogue integrity, i18n
   parity, themes, utils, mock store) but there is no Playwright suite.
5. **No Lighthouse in CI.** Bundle sizes are healthy on paper but Core
   Web Vitals have not been measured against a live deploy.
6. **Language reviewer is deterministic-only.** Real AR/EN grammar review
   is out of scope; the reviewer catches pattern-based issues
   (mixed digits, punctuation direction, doubled words) — not lexical
   quality.
7. **Multi-agent orchestrator is deterministic-only.** The seven
   specialists partition already-extracted facts and emit
   presentation/language findings — they do not each run their own LLM
   pass. Foundation is in place; per-agent prompts are the natural
   next step when a server-side LLM path is added.

### Low (P3)
8. `next lint` prints a deprecation warning about migrating to the
   ESLint CLI. Cosmetic.
9. Sibling directories in the repo (from unrelated projects) are excluded
   via `.mcp.json` scoping and ESLint ignores, but a repo-level CI job
   might trip on them if broadened.

## Reproducing the baseline

```bash
git switch mutabasir/director-lens-platform
npm install
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Live smoke:

```bash
PORT=3000 npm run start &
for p in / /sign-in /projects /new /settings /projects/x /projects/x/published /api/health; do
  curl -s -o /dev/null -w "%{http_code}  ${p}\n" "http://localhost:3000${p}"
done
```
