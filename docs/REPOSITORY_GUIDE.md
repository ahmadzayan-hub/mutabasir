# Repository guide

## Repository identity

The current repository is `ahmadzayan-hub/mutabasir`, branch `main`.
The package remains `mutabasir-director-lens`. Historical desktop-tutorial
branch and package metadata do not authorize moving or rewriting this source.

## Distinguish project storage from evidence storage

`src/lib/store/supabase-store.ts` contains authenticated project CRUD.
`src/lib/store/pipeline-store.ts` stores the document/fact/brief/snapshot workflow
in browser localStorage. These are different persistence boundaries.

The current pipeline does not durably retain the source text needed to validate
a citation after reload. Its explicit local review can be changed by the local
user and is not a server-enforced organizational permission. A complete durable
workflow needs authenticated source, evidence, review and snapshot persistence,
with access-control and recovery tests. Setting environment variables cannot
substitute for that implementation.

See [EVIDENCE_SAFETY.md](../EVIDENCE_SAFETY.md). Template assets remain available
and visibly unverified; do not remove warnings to present a complete product.

## Setup and migration boundaries

Use Node.js 22, `npm ci` and the private `.env.local` copied from the example.
Configure only the approved development backend and never commit real values.
On-device extraction uses WebLLM; model loading and WebGPU/browser capability
need separate testing. Example Anthropic settings are not proof that the local
extraction path calls a hosted provider.

`npm run db:apply` is a live-writing migration command, not a harmless local
health check. Review the two initial-schema files, the actual migration ledger
and existing schema before selecting an upgrade. Back up and restore into an
isolated environment first. The current script’s TLS configuration also needs
security review before using it for an operational database; do not normalize
certificate-verification bypass as a production setup step.

The old deployment guide includes paid-service prerequisites and future wiring.
It is not permission to buy a plan, create access, expose a database or upload
private documents. Verify the exact intended service and approval separately.

## Release acceptance

- Record the exact source, application host and backend identity.
- Run typecheck, lint, tests and build on that source.
- Verify real sign-in and owner/tenant isolation with separate test accounts.
- Check supported document formats against known source text, including failure
  and malformed-file paths without exposing confidential input.
- Check every claim/citation association, unsupported numbers, units and meaning.
- Verify that missing sources, edited claims, stale reviews and reload cannot
  silently authorize publication.
- For a durable implementation, prove save/reload from another authorized
  session and isolated backup/restore of sources, reviews and snapshots.
- Verify real browser/device behavior and any explicitly configured model path.

Passing unit tests is useful evidence for code behavior, not certification of
an executive conclusion. The product does not issue compliance verdicts or
replace the accountable human reviewer.

## Contributions and visual assets

Keep changes small and preserve original source/demo assets and safety labels.
The README uses `public/logo.svg` unchanged, not a new logo or a fabricated
product screenshot. Existing ownership attribution is retained. No license,
certification, endorsement or response-time commitment is introduced.

Do not publish customer documents, prompts or secrets in public issues. Use a
maintainer-approved private channel for sensitive security reports and read
[the security assessment](SECURITY_AND_RESPONSIBLE_AI_ASSESSMENT.md).
