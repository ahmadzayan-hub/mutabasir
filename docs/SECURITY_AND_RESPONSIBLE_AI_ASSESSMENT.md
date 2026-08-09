# Security & Responsible AI assessment

## Threat model summary

| Asset | Threat | Mitigation |
|---|---|---|
| User's uploaded documents | Exfiltration to third-party AI | **On-device inference only** — documents never leave the browser during extraction. `pdfjs-dist` and `mammoth` run client-side; `@mlc-ai/web-llm` runs the model in a WebGPU/Wasm worker |
| Project data (metadata + snapshots) | Cross-user leakage | **Postgres row-level security** (`supabase/migrations/0001_init.sql`): every table has `owner-only` policies checked against `auth.uid()`; child tables (documents, facts, briefs, snapshots) inherit via project ownership |
| Public snapshot access | Enumeration / unauthorised access | Snapshots only readable via `snapshot_by_share_token(text)` — a `SECURITY DEFINER` SQL function that filters on `published = true`; direct table `SELECT` blocked by RLS |
| Session token | XSS theft | Supabase cookies set `HttpOnly` + `SameSite=Lax`; no user-supplied HTML rendered without escape; `SimpleMarkdown` accepts only headings + bold |
| Auth flow | Credential stuffing | Delegated to Supabase Auth (rate-limiting, CAPTCHA on Pro plans) |
| Server actions | DoS (advisory) | Next.js 15.5.18 has an open App Router Server Actions DoS advisory — recommend bump to 15.6+ |
| Vercel deploy | Missing env vars | `isSupabaseConfigured()` gates every server call; app falls back to demo mode safely (documented in `docs/DEPLOYMENT_AND_ROLLBACK.md`) |

## `npm audit --production` — real numbers

Captured from `npm audit --production --json` on this commit:

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 8 |
| Moderate | 1 |
| Low | 0 |

Breakdown (see `docs/PROJECT_AUDIT_BASELINE.md § Security` for the
full table). Two directly affect us:

- **Next.js 15.5.18** — Server Actions DoS. Recommend bumping.
- **pdfjs-dist ≤ 4.7.76** — transitive `canvas` / `tar` chain.
  Recommend bumping to 4.8+.

The rest are transitive through build tooling (`sharp`, `canvas`,
`@mapbox/node-pre-gyp`, `postcss`) and don't affect production runtime.

## Content Security Policy

Not currently set. Recommend adding a strict default via `next.config.ts`
`headers()`:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
img-src 'self' data: blob:;
worker-src 'self' blob:;
connect-src 'self' https://*.supabase.co https://huggingface.co;
```

The `cdn.jsdelivr.net` allowance is required for the `pdfjs-dist`
worker. `huggingface.co` is where `@mlc-ai/web-llm` fetches model
weights.

## Responsible AI

### Intended use
Executive summarisation of user-supplied project documents (contracts,
tenders, O&M reports, construction files) in an EN/AR bilingual
executive register. Not a legal-advice engine, not a decision system.

### Prohibited use
- Financial commitments based on extracted numbers without human
  verification. Every fact is tagged HIGH/MEDIUM/LOW confidence and
  carries a page + quote citation for exactly this reason.
- Automated public disclosure of extracted content. The `snapshot_by_share_token`
  function only returns published snapshots the owner explicitly minted.
- Detection or classification of sensitive personal attributes.

### Human oversight
- Every extracted fact has a "Verify" toggle in the Extract stage.
- Publishing requires composing a brief first (5-point quality gate).
- Print output is the final "board-grade" artefact — human review is
  the last step before it goes to a director.

### Explainability
- Every fact renders its citation quote + page number in-place.
- The `Presentation Designer` agent surfaces missing-metric warnings
  (e.g. "Construction dashboard missing SPI/CPI").
- The `Language Reviewer` shows the exact excerpt that triggered its
  finding.

### Model transparency
- Model ID + size shown in the AI Engine card.
- Extraction meta on the Extract stage says
  `"Source: on-device AI · <model_id>"` or
  `"Source: deterministic baseline"` — no hidden path.

### Limitations disclosed to users
- Marketing FAQ documents: extraction accuracy, confidence tiers, and
  the on-device nature.
- AI Engine card explains: "First load downloads N MB. The model is
  cached after the first run."
- Driver-bug callout explicitly says "This is a hardware/driver
  limitation, not an app bug."

### Bias monitoring
Not currently instrumented. Recommended for the next iteration:
- Track HIGH/MEDIUM/LOW confidence distribution across subjects
- Sample failed extractions for review
- Add a "report a wrong extraction" affordance next to each fact

### Data retention
- Client-side: documents parsed to text stay in React state only —
  not persisted (localStorage quota concerns). Cleared on tab close.
- Server-side: `documents` table only holds metadata (filename, size,
  MIME); the current build does **not** upload document blobs to
  Supabase Storage.
- Extraction facts, briefs, and snapshots persist in localStorage
  today; Supabase persistence is Phase 3b.

### Incident response
- Health endpoint at `/api/health` for uptime probes.
- Self-test in Settings for on-demand pipeline verification.
- Rollback: revert the offending commit + `git push --force-with-lease`
  is safe on the `mutabasir/*` namespace (owned solely by this project).

## Not present today

- No formal DPIA
- No SOC-2 controls
- No audit-log persistence (server-side) — Vercel access logs only
- No red-team evaluation of the extraction prompt against injection
- No consent-management platform

These are appropriate to add when moving from beta to production for
customers in regulated verticals (government, financial services).
