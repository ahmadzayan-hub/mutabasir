# AI system & prompt architecture

## High-level flow

```
Documents (client)                           On-device AI (WebLLM/WebGPU)
   │                                                │
   ├──> pdfjs-dist / mammoth ────> text ────────────┤
   │                                                │
   │                                                ▼
   │                                     extractFactsWithLlm()
   │                                                │
   │                                                │  (schema-validated JSON)
   │                                                ▼
   │                                        DbExtractedFact[]
   │                                                │
   │                                                ▼
   │                                        composeBrief()   ── deterministic
   │                                                │
   │                                                ▼
   │                                        Multi-agent orchestrator
   │                                                │
   ▼                                                ▼
localStorage (pipeline-store)              Published snapshot (client)
```

**Everything before the published snapshot happens client-side.** No
documents leave the device. This is the privacy contract.

## Model selection · `src/lib/llm/web-llm.ts`

Seven curated `MODEL_OPTIONS`, ordered smallest first, all present in
the installed `@mlc-ai/web-llm` prebuilt catalogue (unit-tested for
integrity):

| ID | Size | Default? | RAM floor |
|---|---|---|---|
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | 360 MB | ✅ | ~2 GB |
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | 260 MB | — | ~2 GB |
| `Llama-3.2-1B-Instruct-q4f32_1-MLC` | 712 MB | — | ~4 GB |
| `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | 950 MB | — | ~6 GB |
| `gemma-2-2b-it-q4f16_1-MLC` | 1.4 GB | — | ~6 GB |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | 1.8 GB | — | ~8 GB |
| `Phi-3.5-mini-instruct-q4f16_1-MLC` | 2.2 GB | — | ~8 GB, desktop |

Default = smallest. `hasEnoughRamForLargeModel(4)` guards models
> 500 MB with a bilingual confirm dialog on < 4 GB devices.

## Device probe · `probeWebGpuCompute()`

Before initiating any model download, the app compiles a trivial WGSL
compute pipeline against the user's GPU adapter. If the driver rejects
(the Android `VK_ERROR_UNKNOWN` we observed in production), the result
is cached in `localStorage["mutabasir.webgpu.probe.v1"]` and future
visits skip the doomed download.

`classifyProbeError()` matches `VK_ERROR_*`, `CheckVkSuccessImpl`,
`uncaptured`, `device is lost` and returns a bilingual friendly
message. See `src/lib/llm/web-llm.ts` `PROBE_SHADER`.

## Extraction · `src/lib/extraction/llm-extractor.ts`

Prompt structure (executed on the loaded model):

- **System role:** "You are a precise extraction engine for executive
  review documents. Always respond with a single JSON array following
  the requested schema. Do not add commentary, markdown, or code
  fences. Cite an exact quote (≤ 30 words) and the page number where
  the fact appears. Confidence: HIGH only when the answer is explicitly
  stated; MEDIUM when inferable; LOW when uncertain."
- **User role:**
  - Subject (one of 4)
  - Authority + counterparty hints from the project
  - Documents: filename, document_type, first 6 000 chars of parsed text
  - **Schema for the requested subject** (verbatim in the prompt)
  - "JSON array only. No prose."

Parsing:

1. Strip ```` ```json ```` / ```` ``` ```` fences
2. Extract the first balanced `[...]`
3. `JSON.parse` — if it fails, fall back to `runMockExtraction`
4. Coerce every item into `DbExtractedFact` shape with a default
   `MEDIUM` confidence if the model omitted one

Fallback triggers (each returns from the deterministic `runMockExtraction`
so the pipeline never dead-ends):

- `model_not_loaded` · no LLM engine active
- `no_documents` · empty queue
- `no_text_extracted` · < 80 chars total parsed
- `chat_failed` · LLM inference threw
- `parse_failed` · could not locate a JSON array
- `empty_array` · LLM returned `[]`

## Deterministic extractor · `src/lib/extraction/mock-extractor.ts`

Produces a subject-specific fact set that mirrors the LLM schema. Every
fact carries `citation_quote`, `citation_page`, and a `confidence`
tier. This is what powers the self-test panel and 45 of the 45 unit
tests — the LLM path is not covered by unit tests because it requires
WebGPU which isn't present in Node.

## Brief composer · `src/lib/brief/composer.ts`

Templated bilingual (EN + AR) brief generator. Takes the extracted
facts + 5 audiences (director / ceo / board / internal_team /
external_client) and emits ready-to-copy Markdown for both languages.
No LLM required. Every subject × audience × locale combination is
unit-tested for non-empty output ≥ 30 chars.

## Multi-agent orchestrator · `src/lib/agents/*`

Seven specialists partition the shared fact set:

| Agent | Focus | Fact types claimed |
|---|---|---|
| Technical | Scope, progress, HSE | `project_scope`, `physical_progress`, `asset_inventory`, `sla_performance`, `hse_performance`, `milestone_status` |
| Contract | Parties, term, law, termination | `contracting_parties`, `term`, `governing_law`, `service_contract`, `termination`, `liquidated_damages` |
| Financial | Value, payment, change orders | `contract_value`, `payment_terms`, `invoiced_to_date`, `change_orders` |
| Administration | Governance, evaluation, award | `issuing_authority`, `evaluation_weights`, `bidder_scores`, `submission_deadline`, `recommended_award` |
| PMI | Schedule, backlog, risk | `schedule_status`, `work_order_backlog`, `open_risk` |
| Presentation Designer | Layout hints, missing-metric warnings | — (emits `presentation_hints`) |
| Language Reviewer | AR/EN grammar signals on the brief text | — (emits `ReviewFinding[]`) |

Deterministic — no LLM calls. Facts that don't match any specialist's
list fall through to Technical as a catch-all so nothing is lost.

## Language reviewer · `src/lib/agents/language-reviewer.ts`

Pattern-based checks that run on the brief text (no LLM):

- Arabic block containing Latin digits (should be Eastern-Arabic)
- Arabic block with Latin `,` (should be `،`) or `?` (should be `؟`)
- English block with Eastern-Arabic digits (should be Latin)
- Doubled words (case-insensitive, both scripts)
- Space before punctuation
- Straight `"` mixed with curly `"" ""`
- Trailing whitespace / double spaces

Each finding carries `message_en`, `message_ar`, severity, and an
excerpt.

## What's intentionally **not** here

- **No per-agent LLM prompts.** The architecture is ready for them
  (each `AgentSpec` has a `fact_types` filter; the extractor could be
  called per-agent with a subject-narrowed schema) but this pass ships
  the deterministic orchestrator only.
- **No RAG.** The Master Prompt mentions RAG; this project doesn't need
  it — every fact is grounded on the user-uploaded documents directly
  and cited by page number.
- **No fine-tuning.** Models are used as shipped.
- **No cloud-side LLM (yet).** All inference is on-device. A
  server-side Anthropic path is planned for driver-hostile devices;
  the `ANTHROPIC_API_KEY` env var is already declared.

## Files to read

- `src/lib/llm/web-llm.ts` — model catalogue, WebGPU probe, engine
  singleton, chat wrapper
- `src/lib/extraction/llm-extractor.ts` — prompt construction, JSON
  extraction, coercion, fallbacks
- `src/lib/extraction/mock-extractor.ts` — deterministic fact set per
  subject
- `src/lib/brief/composer.ts` — audience-aware bilingual brief
- `src/lib/agents/orchestrator.ts` — 7-agent partition + cross-findings
- `src/lib/agents/language-reviewer.ts` — pattern-based text checks
- `src/lib/agents/presentation-designer.ts` — layout hints per subject
- `src/lib/self-test/runner.ts` — end-to-end deterministic verification
