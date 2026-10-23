// LLM-backed fact extraction. Prompts a small on-device model with the
// parsed document text plus a JSON schema appropriate for the project
// subject, validates the response, and falls back to the deterministic
// mock extractor when the model isn't available, returns malformed
// output, or fails outright.

"use client";

import type {
  Confidence,
  DbExtractedFact,
  Subject,
} from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";
import { newId } from "@/lib/store/pipeline-store";
import { asTemplateFacts, runMockExtraction } from "@/lib/extraction/mock-extractor";
import { chat, getLoadedModelId } from "@/lib/llm/web-llm";

export interface LlmExtractInput {
  projectId: string;
  subject: Subject;
  authorityEn: string | null;
  counterpartyEn: string | null;
  documents: PipelineDocument[];
  /** Per-document parsed text. Keys are document ids. */
  documentTexts: Record<string, string>;
}

const SCHEMA_BY_SUBJECT: Record<Subject, string> = {
  contract_management: `[
  { "fact_type": "contracting_parties", "payload": { "authority": string, "counterparty": string }, "citation_quote": string, "citation_page": number, "confidence": "HIGH"|"MEDIUM"|"LOW" },
  { "fact_type": "contract_value", "payload": { "amount": number, "currency": string } },
  { "fact_type": "term", "payload": { "months": number, "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } },
  { "fact_type": "payment_terms", "payload": { "schedule": string, "net_days": number, "retention_pct": number } },
  { "fact_type": "governing_law", "payload": { "jurisdiction": string, "venue": string } },
  { "fact_type": "open_risk", "payload": { "title": string, "severity": "red"|"amber"|"green" } }
]`,
  tender_evaluation: `[
  { "fact_type": "issuing_authority", "payload": { "name": string } },
  { "fact_type": "evaluation_weights", "payload": { "technical_pct": number, "commercial_pct": number, "passing_technical_score": number } },
  { "fact_type": "bidder_scores", "payload": { "bidders": [ { "name": string, "technical": number, "commercial": number, "total": number } ] } },
  { "fact_type": "submission_deadline", "payload": { "date": "YYYY-MM-DD", "time": string } },
  { "fact_type": "recommended_award", "payload": { "bidder": string, "rationale": string, "weighted_score": number } }
]`,
  operations_maintenance: `[
  { "fact_type": "service_contract", "payload": { "authority": string, "contractor": string, "scope": string } },
  { "fact_type": "asset_inventory", "payload": { "sites": number, "critical_assets": number, "planned_pm_per_month": number } },
  { "fact_type": "sla_performance", "payload": { "availability_pct": number, "mttr_hours": number, "first_time_fix_pct": number, "sla_breaches_quarter": number } },
  { "fact_type": "work_order_backlog", "payload": { "open": number, "overdue": number, "oldest_days": number } },
  { "fact_type": "open_risk", "payload": { "title": string, "severity": "red"|"amber"|"green" } }
]`,
  construction: `[
  { "fact_type": "project_scope", "payload": { "owner": string, "contractor": string, "type": string, "contract_form": string } },
  { "fact_type": "contract_value", "payload": { "amount": number, "currency": string, "change_orders_pct": number } },
  { "fact_type": "schedule_status", "payload": { "original_completion": "YYYY-MM-DD", "forecast_completion": "YYYY-MM-DD", "delay_days": number } },
  { "fact_type": "physical_progress", "payload": { "planned_pct": number, "actual_pct": number, "spi": number, "cpi": number } },
  { "fact_type": "hse_performance", "payload": { "man_hours_qtr": number, "ltifr": number, "recordable_incidents": number } },
  { "fact_type": "open_risk", "payload": { "title": string, "severity": "red"|"amber"|"green" } }
]`,
};

function buildPrompt(input: LlmExtractInput): { system: string; user: string } {
  const subjectLabel: Record<Subject, string> = {
    contract_management: "contract management",
    tender_evaluation: "tender evaluation",
    operations_maintenance: "operations & maintenance",
    construction: "construction project delivery",
  };

  const corpus = input.documents
    .map((doc) => {
      const text = (input.documentTexts[doc.id] ?? "").slice(0, 6000);
      return `=== ${doc.filename} (${doc.document_type}) ===\n${text || "(no extractable text)"}`;
    })
    .join("\n\n");

  const system = `You are a precise extraction engine for executive review documents. Always respond with a single JSON array following the requested schema. Do not add commentary, markdown, or code fences. Cite an exact quote (≤ 30 words) and the page number where the fact appears. Confidence: HIGH only when the answer is explicitly stated; MEDIUM when inferable; LOW when uncertain. Return an empty array [] only if no facts are present.`;

  const user = `Subject: ${subjectLabel[input.subject]}.
Authority hint: ${input.authorityEn ?? "(unknown)"}
Counterparty hint: ${input.counterpartyEn ?? "(unknown)"}

DOCUMENTS:
${corpus}

Return facts strictly following this schema. Each item MUST include "fact_type", "payload", "citation_quote", "citation_page", and "confidence":
${SCHEMA_BY_SUBJECT[input.subject]}

JSON array only. No prose.`;
  return { system, user };
}

interface RawFact {
  fact_type?: unknown;
  payload?: unknown;
  citation_quote?: unknown;
  citation_page?: unknown;
  confidence?: unknown;
}

function coerceFacts(
  raw: unknown,
  projectId: string,
  documentIdFallback: string,
): DbExtractedFact[] {
  if (!Array.isArray(raw)) return [];
  const facts: DbExtractedFact[] = [];
  for (const item of raw as RawFact[]) {
    if (!item || typeof item.fact_type !== "string") continue;
    if (typeof item.payload !== "object" || item.payload === null) continue;
    const confidence: Confidence =
      item.confidence === "HIGH" || item.confidence === "MEDIUM" || item.confidence === "LOW"
        ? (item.confidence as Confidence)
        : "MEDIUM";
    facts.push({
      id: newId("fact"),
      project_id: projectId,
      document_id: documentIdFallback,
      fact_type: item.fact_type,
      payload_json: item.payload as Record<string, unknown>,
      citation_page: typeof item.citation_page === "number" ? item.citation_page : null,
      citation_quote: typeof item.citation_quote === "string" ? item.citation_quote : null,
      confidence,
      user_verified: false,
      created_at: new Date().toISOString(),
    });
  }
  return facts;
}

function extractJsonArray(raw: string): unknown {
  // Strip code fences and locate the first balanced array.
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export interface LlmExtractResult {
  facts: DbExtractedFact[];
  used_llm: boolean;
  model_id: string | null;
  fallback_reason: string | null;
}

export async function extractFactsWithLlm(
  input: LlmExtractInput,
): Promise<LlmExtractResult> {
  const fallbackFacts = (reason: string): LlmExtractResult => ({
    facts: asTemplateFacts(runMockExtraction({
      projectId: input.projectId,
      subject: input.subject,
      documents: input.documents,
      authorityEn: input.authorityEn,
      counterpartyEn: input.counterpartyEn,
    })),
    used_llm: false,
    model_id: null,
    fallback_reason: reason,
  });

  const loadedModel = getLoadedModelId();
  if (!loadedModel) return fallbackFacts("model_not_loaded");
  if (input.documents.length === 0) return fallbackFacts("no_documents");

  // If no document has any extractable text, the LLM has nothing to read.
  const totalChars = Object.values(input.documentTexts).reduce(
    (n, t) => n + (t?.length ?? 0),
    0,
  );
  if (totalChars < 80) return fallbackFacts("no_text_extracted");

  const { system, user } = buildPrompt(input);

  let raw: string;
  try {
    raw = await chat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 1400,
    });
  } catch {
    // Do not expose model errors, prompts or document content to browser logs.
    return fallbackFacts("chat_failed");
  }

  const json = extractJsonArray(raw);
  if (!json) return fallbackFacts("parse_failed");

  const primaryDocId = input.documents[0]!.id;
  const facts = coerceFacts(json, input.projectId, primaryDocId);
  if (facts.length === 0) return fallbackFacts("empty_array");

  return {
    facts: facts.map((f) => ({ ...f, origin: "llm" as const })),
    used_llm: true,
    model_id: loadedModel,
    fallback_reason: null,
  };
}
