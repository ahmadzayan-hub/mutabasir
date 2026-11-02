# W3 browser regression coverage

Two Playwright cases are implemented in `e2e/`: the no-credentials demo journey
(sign-up, project creation, synthetic TXT upload, baseline extraction, brief,
and blocked publication), and Arabic locale persistence across navigation.

Run `npm ci`, `npm run build`, `npx playwright install chromium`, then
`npm run test:e2e`. CI runs these after the existing quality checks.
The test server explicitly clears Supabase settings and uses an isolated browser
context for each case. No model is downloaded and no real customer data is used.

## Verification status — 2026-11-02

Dependency installation is still running locally with output saved outside the
repo. Build and E2E are **unverified**, not passing claims.

Static review of the single spec: 8/10; awaited actions, web-first assertions,
relative navigation, isolated contexts, no fixed sleeps or mocked app behavior.
The file input and document language use structural selectors because these
nodes have no equivalent accessible role. Runtime selectors remain unverified.

## Remaining acceptance gates

- Successful publication is intentionally absent: template/baseline evidence
  cannot pass the source-bound review gate. A model-capable environment and
  explicit human review are required for the successful-publish happy path.
- Real Supabase sign-up and persistence are not exercised by the demo suite.
- Lighthouse's four live-preview scores have not been measured. A confirmed
  reachable preview and a browser audit run are required; local build metrics
  are not a substitute.
