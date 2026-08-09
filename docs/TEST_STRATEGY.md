# Test strategy

## Current state — verified

```
Test Files  7 passed (7)
     Tests  45 passed (45)
  Duration  2.5–4 s
```

## Test pyramid — what actually exists

| Layer | Framework | Files | Tests |
|---|---|---|---|
| Unit — pure logic | vitest | 7 | 45 |
| Integration | — | 0 | 0 |
| End-to-end | — | 0 | 0 |
| Visual regression | — | 0 | 0 |

## What each file covers

### `src/lib/i18n/dictionary.test.ts` (4 tests)
- EN and AR namespaces have the same shape
- No em-dashes anywhere (typography rule)
- Brand strings are present in both locales
- Bilingual app name matches the wordmark

### `src/lib/themes/themes.test.ts` (7 tests)
- Every theme has EN + AR name, mode, colours
- No duplicate theme IDs
- Colour hex values valid

### `src/lib/utils/utils.test.ts` (11 tests)
- `cn()` class merging
- `formatDate()` — EN and AR locales
- `formatBytes()` — SI + IEC
- Sanitisation helpers

### `src/lib/store/projects.test.ts` (5 tests)
- `newProject()` builds a draft project with timestamps
- `newProject` preserves nullable fields
- `sortProjects` sorts by created_at desc
- `isValidProject` accepts a real project
- `isValidProject` rejects garbage

### `src/lib/extraction/pipeline.test.ts` (7 tests)
- Every subject produces cited facts
- `groupFactsByCategory` never drops a fact
- Every subject × audience × locale of `composeBrief` returns ≥ 30 chars
- Numeral formatter emits Eastern-Arabic digits in AR

### `src/lib/llm/web-llm.test.ts` (4 tests)
- Catalogue not empty, default is registered
- Every advertised model ID exists in installed `@mlc-ai/web-llm`
  (reads compiled JS files off disk)
- Default is one of the two smallest models (mobile-first)
- Every model has EN + AR descriptions and positive size

### `src/lib/agents/agents.test.ts` (11 tests)
- Registry has 7 unique agents with bilingual names
- Orchestrator partitions every fact — no loss
- Each subject emits ≥ 1 presentation hint
- Subject-critical metric absence raises a design finding
- Language reviewer catches Latin digits in Arabic text
- Language reviewer catches Latin comma in Arabic text
- Language reviewer catches Eastern-Arabic digits in English text
- Language reviewer catches doubled words
- Language reviewer passes clean bilingual text with zero errors

## What's not tested — with prioritised recommendations

### P1 — E2E of the core journey
Recommendation: Add Playwright covering:
1. Sign-up + email verification (mock the email step)
2. Create a project (all 4 subjects)
3. Upload a fixture PDF from `evals/fixtures/`
4. Trigger extraction (deterministic path — no WebGPU on CI)
5. Compose a brief
6. Publish and open `/published`
7. Presenter mode toggle
8. Print (verify no chrome bleeds into the print stylesheet)

### P2 — Component tests
Recommendation: `@testing-library/react` on:
- `<FactItem>` — verify toggle, citation rendering
- `<StageTabs>` — disabled states, active state
- `<AgentPanel>` — tab switching, count badges
- `<MetricRing>` — SVG output for 0 / 0.5 / 1 values

### P2 — LLM path
Recommendation: See `docs/AI_EVALUATION_PLAN.md`. Since WebGPU is
absent in Node, this requires either a Playwright harness or a
server-side Anthropic path.

### P3 — Visual regression
Recommendation: Playwright screenshots at 360 / 390 / 768 / 1024 /
1440 for the two heaviest routes (project detail, published dashboard).

### P3 — Accessibility automated
Recommendation: `@axe-core/playwright` or `jest-axe` on the same
critical paths.

## Test commands

```bash
npm test                # single run
npm run test:watch      # watch mode
npx vitest --coverage   # coverage (not currently wired to a threshold)
```

## Conventions

- Test files live next to source: `foo.ts` → `foo.test.ts`
- Fixtures use `fake…()` factories, not real data
- No network calls, no fs writes outside `os.tmpdir()`
- Tests must be deterministic (no `Math.random`, no `Date.now()` without fixture)
