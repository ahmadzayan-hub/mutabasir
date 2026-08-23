// EvidenceObject production — the portfolio evidence contract (v0.1).
// Mirrors docs/contracts/evidence-object.schema.json: every extracted fact
// mints exactly one evidence object, and consuming systems (VERTEX, ExecFlow,
// Pitchora, Annual Plan) reference the evidence_id — never a mutated copy.

import type { Confidence, DbExtractedFact } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";

export const EXTRACTOR_VERSION = "mutabasir-extract@0.1.0";

export type EvidenceClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type EvidenceSourceType =
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "image"
  | "scan"
  | "email"
  | "audio"
  | "url"
  | "other";

export interface EvidenceLocator {
  paragraph?: number | null;
  table?: number | null;
  row?: number | null;
  cell?: string | null;
  char_start?: number | null;
  char_end?: number | null;
}

export interface EvidenceObject {
  evidence_id: string;
  source_document_id: string;
  source_version: string;
  source_type: EvidenceSourceType;
  page: number | null;
  section: string | null;
  locator: EvidenceLocator | null;
  extracted_text: string;
  source_hash: string;
  extractor_version: string;
  confidence: number;
  classification: EvidenceClassification;
  access_policy: {
    owner_product: string;
    allowed_products?: string[];
    allowed_roles?: string[];
  } | null;
  created_at: string;
}

// --- ULID (Crockford base32, 10 time chars + 16 random chars) ---------------

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now: number = Date.now()): string {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let rand = "";
  for (let i = 0; i < 16; i++) rand += CROCKFORD[(bytes[i] ?? 0) % 32];
  return time + rand;
}

export function newEvidenceId(): string {
  return `ev_${ulid()}`;
}

// --- Hashing ----------------------------------------------------------------

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSource(text: string): Promise<string> {
  return `sha256:${await sha256Hex(text)}`;
}

// --- Mapping helpers --------------------------------------------------------

const CONFIDENCE_SCORE: Record<Confidence, number> = {
  HIGH: 0.9,
  MEDIUM: 0.6,
  LOW: 0.3,
};

export function confidenceScore(c: Confidence): number {
  return CONFIDENCE_SCORE[c] ?? 0.3;
}

export function sourceTypeFor(doc: {
  mime_type?: string;
  filename?: string;
}): EvidenceSourceType {
  const name = (doc.filename ?? "").toLowerCase();
  const mime = (doc.mime_type ?? "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || ext === "doc" || mime.includes("wordprocessingml")) return "docx";
  if (ext === "pptx" || ext === "ppt" || mime.includes("presentationml")) return "pptx";
  if (ext === "xlsx" || ext === "xls" || mime.includes("spreadsheetml")) return "xlsx";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (mime.startsWith("image/")) return "image";
  if (ext === "eml" || ext === "msg" || mime === "message/rfc822") return "email";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

// --- Minting ----------------------------------------------------------------

export interface MintInput {
  fact: DbExtractedFact;
  document: PipelineDocument | undefined;
  /** Parsed text of the source document (when available). */
  documentText: string | undefined;
  classification?: EvidenceClassification;
}

/** Build the EvidenceObject for one extracted fact. */
export async function mintEvidence(input: MintInput): Promise<EvidenceObject> {
  const { fact, document, documentText } = input;
  const quote = fact.citation_quote?.trim() || null;
  const extractedText =
    quote ?? `${fact.fact_type}: ${JSON.stringify(fact.payload_json)}`;

  // Finest anchor we can produce today: the char span of the verbatim quote.
  let locator: EvidenceLocator | null = null;
  if (quote && documentText) {
    const idx = documentText.indexOf(quote);
    if (idx >= 0) {
      locator = { char_start: idx, char_end: idx + quote.length };
    }
  }

  // Hash the exact source version the evidence was extracted from; when the
  // parsed text is unavailable (mock path), hash the stable document identity.
  const hashBasis =
    documentText ??
    `${document?.id ?? fact.document_id}:${document?.filename ?? ""}:${document?.size_bytes ?? 0}`;

  return {
    evidence_id: newEvidenceId(),
    source_document_id: fact.document_id,
    source_version: "1",
    source_type: sourceTypeFor(document ?? {}),
    page: fact.citation_page ?? null,
    section: null,
    locator,
    extracted_text: extractedText,
    source_hash: await hashSource(hashBasis),
    extractor_version: EXTRACTOR_VERSION,
    confidence: confidenceScore(fact.confidence),
    classification: input.classification ?? "internal",
    access_policy: {
      owner_product: "mutabasir",
      allowed_products: ["vertex", "exeflow", "pitchora", "annual-operation-plan-2026"],
    },
    created_at: new Date().toISOString(),
  };
}

/**
 * Mint evidence for a batch of freshly extracted facts and stamp each fact
 * with its evidence_id. One fact = one evidence object.
 */
export async function mintEvidenceForFacts(input: {
  facts: DbExtractedFact[];
  documents: PipelineDocument[];
  documentTexts: Record<string, string>;
  classification?: EvidenceClassification;
}): Promise<{ facts: DbExtractedFact[]; evidence: EvidenceObject[] }> {
  const evidence: EvidenceObject[] = [];
  const facts: DbExtractedFact[] = [];
  for (const fact of input.facts) {
    const document = input.documents.find((d) => d.id === fact.document_id);
    const ev = await mintEvidence({
      fact,
      document,
      documentText: input.documentTexts[fact.document_id],
      classification: input.classification,
    });
    evidence.push(ev);
    facts.push({ ...fact, evidence_id: ev.evidence_id });
  }
  return { facts, evidence };
}

// --- Validation (contract guard, mirrors the JSON Schema) -------------------

const EVIDENCE_ID_RE = /^ev_[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const SOURCE_HASH_RE = /^sha256:[0-9a-f]{64}$/;
const CLASSIFICATIONS: EvidenceClassification[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
];

export function validateEvidence(obj: EvidenceObject): string[] {
  const errors: string[] = [];
  if (!EVIDENCE_ID_RE.test(obj.evidence_id)) errors.push("evidence_id format");
  if (!obj.source_document_id) errors.push("source_document_id required");
  if (!obj.source_version) errors.push("source_version required");
  if (!obj.extracted_text || obj.extracted_text.length < 1)
    errors.push("extracted_text required");
  if (!SOURCE_HASH_RE.test(obj.source_hash)) errors.push("source_hash format");
  if (!obj.extractor_version) errors.push("extractor_version required");
  if (typeof obj.confidence !== "number" || obj.confidence < 0 || obj.confidence > 1)
    errors.push("confidence out of range");
  if (!CLASSIFICATIONS.includes(obj.classification)) errors.push("classification enum");
  if (!obj.created_at) errors.push("created_at required");
  if (obj.page !== null && (!Number.isInteger(obj.page) || obj.page < 1))
    errors.push("page must be a positive integer or null");
  return errors;
}
