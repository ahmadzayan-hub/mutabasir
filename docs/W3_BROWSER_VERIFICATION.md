# W3 browser regression coverage

Two Playwright cases cover the no-credentials demo journey (sign-up, project
creation, synthetic TXT upload, baseline extraction, brief, blocked publication)
and Arabic locale persistence across navigation.

Run `npm ci`, `npm run build`, `npx playwright install chromium`, then
`npm run test:e2e`. CI runs these after existing quality checks. The test server
clears Supabase settings and each test has an isolated browser context.
No model is downloaded and no real customer data is used.

## Verification - 2026-11-02

- `npm ci --no-audit --no-fund`: completed; 458 packages added in 6 minutes.
- `npm run build`: passed, exit 0; TypeScript passed, 12 static pages generated.
- `npx playwright install chromium`: passed, exit 0.
- `npm run test:e2e`: **2 passed, 0 failed**, exit 0, 43.1 seconds.
  - Demo sign-up/project/upload/extract/brief/publication gate: passed (19.1s).
  - Arabic locale persistence: passed (12.7s).
- An earlier E2E attempt launched before build completion failed at server
  startup (missing preview-props.json); no test cases ran in that attempt.
  The complete rerun above used the finished production build.

Single-spec static review: 8/10; awaited actions, web-first assertions,
relative navigation, isolated contexts and no fixed sleeps or mocked app logic.
The hidden file input and document-language assertions use structural selectors
because those nodes have no equivalent accessible role. Both cases now also
have runtime verification.

## Remaining acceptance gates

- Successful publication is intentionally absent: template/baseline evidence
  cannot pass the source-bound review gate. A model-capable environment and
  explicit human review are required for the successful-publish happy path.
- Real Supabase sign-up and persistence are not exercised by this demo suite.
- Lighthouse scores remain unmeasured. The temporary local E2E preview stopped
  at suite completion; no Lighthouse audit was run and no live-preview
  performance claim is made.
- Hosted CI for this branch has not been verified by these local results.
