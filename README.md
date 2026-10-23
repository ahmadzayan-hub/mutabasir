<img src="public/logo.svg" alt="Existing Mutabasir, The Director’s Lens wordmark" width="240" height="64">

# Mutabasir · متبصّر

**Read the claim beside its source before turning it into a brief.**

Mutabasir helps executives and reviewers inspect document-derived claims,
compare their citations with the source text, and prepare bilingual briefs.
Its useful unit is a claim a person can check, not a confident-looking summary.

Next.js 15 · React 19 · TypeScript · WebLLM · English / العربية

[Capabilities](#what-it-helps-you-do) · [Evidence rules](#evidence-and-human-review) ·
[Setup](#local-setup) · [Verification](#verify-changes) · [العربية](#بالعربية)

## What it helps you do

| Your task | Repository capability | Important boundary |
| --- | --- | --- |
| Read source documents | Browser-side PDF, DOCX and text parsing | Supported parsing does not guarantee every page or table is correct |
| Inspect a proposed claim | Side-by-side evidence, source-span matching and numeric checks | Lexical/numeric consistency is not semantic truth |
| Review the evidence | Explicit local human review bound to the current claim and citation | Local review is not authenticated organizational approval |
| Prepare a brief | English/Arabic output, copy and Markdown export | Template output is visibly marked unverified and cannot pass reviewed publication |
| Keep a readable snapshot | Local snapshots and print-oriented published view | Pipeline storage is local to the browser, not a durable cloud evidence record |

**Document → Parsed text → Proposed claims → Source inspection → Human review → Brief**

## Current status

The source is [`ahmadzayan-hub/mutabasir`](https://github.com/ahmadzayan-hub/mutabasir),
branch `main`. Earlier references to a `desktop-tutorial` branch are historical,
not instructions for this standalone repository.

The 23 October 2026 integration at `8f21c4a00310a0de2539a8326bc2cd79b88f3904`
passed **96 tests across 12 files**, TypeScript, lint and a production build.
[Exact integrated CI result](https://github.com/ahmadzayan-hub/mutabasir/actions/runs/40004384708)

**The full durable evidence workflow is not implemented by configuration alone.**
Supabase-backed sign-in and project CRUD exist, while documents, facts, briefs
and snapshots in the current pipeline use browser `localStorage`. Source text
is not durably stored. Configuring Supabase does not automatically move that
pipeline to the cloud or make local review an organizational security boundary.

Hosted acceptance, authenticated durable evidence/review storage and verified
backup recovery remain open. The repository does not claim that a preview,
successful build or sample workflow is a complete operational installation.

## Evidence and human review

- Mock/template facts start as **LOW / TEMPLATE / NOT EVIDENCE**. They cannot
  pass the reviewed publication gate.
- A claim needs an available exact citation, compatible numeric values and an
  explicit human review tied to its unchanged claim/citation payload.
- Citation matching does not verify meaning, units, dates or the conclusion.
  A person must compare the claim with the source.
- Edits, missing sources, stale reviews and legacy flags fail closed.
- After reload, sources must be re-extracted and reviewed. Old local snapshots
  remain readable with a permanent non-operational notice.
- These browser checks are safeguards, not protection against someone editing
  their own `localStorage`.

Read the precise contract in [EVIDENCE_SAFETY.md](EVIDENCE_SAFETY.md).

## Local setup

Quality CI uses Node.js 22 and the committed npm lockfile.

```bash
git clone https://github.com/ahmadzayan-hub/mutabasir.git
cd mutabasir
npm ci
cp .env.example .env.local
```

Keep `.env.local` private and replace placeholders only for an approved
development backend. Real project sign-in needs the correct Supabase URL,
public key and schema. Database migration access is separate and must never
be bundled into a browser asset.

The current extraction path uses optional on-device WebLLM. It needs a
compatible WebGPU browser and an explicit model load/download. When unavailable,
the fallback produces labelled templates, not verified source findings.
Adding an Anthropic key from the example file does not make this browser path
a server-hosted extraction workflow.

```bash
npm run dev
```

Open **http://localhost:3000**. For a configured project backend, sign in at
`/sign-in` and use `/projects`. This starts the application; it does not complete
the durable evidence pipeline described in the status section.

Do not run `npm run db:apply` against production as a quick-start step. It writes
schema state, and the repository contains more than one initial-schema file.
Inspect compatibility, existing data and the migration ledger first; verify a
backup and isolated restore. See [the repository guide](docs/REPOSITORY_GUIDE.md).

## Source map

| Area | Source |
| --- | --- |
| Project workflow and publication UI | `src/app/(app)/projects/` |
| Parsing and optional local inference | `src/lib/parsers/`, `src/lib/llm/`, `src/lib/extraction/` |
| Claim/source rules and brief composition | `src/lib/evidence/`, `src/lib/brief/` |
| Local pipeline persistence | `src/lib/store/pipeline-store.ts` |
| Supabase-backed project records | `src/lib/store/supabase-store.ts` |
| Database/storage definitions | `supabase/migrations/`, `supabase/storage/` |

## Verify changes

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The current safety tests mock model interfaces; their pass does not prove a
real model download or browser/device workflow. Before operational use, verify
actual parsing, source review, negative/decimal/Arabic numeric cases, edited
claims, repeated clicks, reload behavior, unauthorized access and recovery.
Never use confidential records just to make a smoke test look realistic.

## Documentation

- [Evidence safety contract](EVIDENCE_SAFETY.md)
- [EvidenceObject contract](docs/contracts/EVIDENCE_OBJECT.md)
- [Architecture](docs/ARCHITECTURE.md) and [user journeys](docs/PRODUCT_REQUIREMENTS_AND_USER_JOURNEYS.md)
- [Security and responsible AI](docs/SECURITY_AND_RESPONSIBLE_AI_ASSESSMENT.md)
- [Test strategy](docs/TEST_STRATEGY.md) and [release readiness](docs/RELEASE_READINESS_REPORT.md)
- [Repository guide](docs/REPOSITORY_GUIDE.md) for current setup boundaries and contribution checks

Design documents describe intended behavior as well as implementation. Where
historical copy conflicts, the current safety contract and source take
precedence over claims of automatic verification or complete cloud persistence.

## بالعربية

**متبصّر** يساعد على قراءة الادعاء بجانب مصدره وإعداد ملخص عربي أو إنجليزي بعد
المراجعة. وجود اقتباس أو تطابق رقمي لا يثبت صحة المعنى، ولا يحل محل تحقق الإنسان.

مسار الأدلة الحالي يحفظ بعض الحالة محليًا في المتصفح ولا يحتفظ بنصوص المصادر
حفظًا سحابيًا دائمًا. لذلك يلزم إعادة الاستخراج والمراجعة بعد إعادة التحميل،
ولا تُقدّم المراجعة المحلية على أنها اعتماد مؤسسي. تشغيل النسخة الكاملة يحتاج
استكمال هذا المسار واختبار الهوية والحفظ والاستعادة، لا إخفاء تنبيه التجربة.

## License and contributions

No repository-wide license file is present in the reviewed source. This README
does not grant or change a license. Preserve source assets, existing notices
and honest evidence labels. Do not commit source documents, keys or user data.

Built by Beyond Connect General Trading L.L.C · Dubai, UAE.
