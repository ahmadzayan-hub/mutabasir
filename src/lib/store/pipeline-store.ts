// Client-side persistence for the demo pipeline (documents, extracted facts,
// briefs, published snapshots). Uses localStorage keyed by project id.
// Replaced by Supabase tables + Storage in Phase 3.

"use client";

import type {
  DbBrief,
  DbDocument,
  DbExtractedFact,
  DbSnapshot,
  DocumentType,
  Confidence,
  BriefAudience,
} from "@/types/database";
import type { EvidenceObject } from "@/lib/evidence/evidence";

const PREFIX = "mutabasir.pipeline.v1";

export interface PipelineDocument
  extends Omit<DbDocument, "storage_path" | "uploaded_by" | "size_bytes"> {
  size_bytes: number;
  preview_text: string | null;
}

export interface PipelineBrief extends Omit<DbBrief, "author_id"> {
  text_ar: string;
  audience: BriefAudience;
}

export interface PipelineSnapshot
  extends Omit<
    DbSnapshot,
    | "composition_json"
    | "quality_gate_json"
    | "rendered_html"
    | "pdf_storage_path"
    | "created_by"
  > {
  quality: {
    has_documents: boolean;
    has_facts: boolean;
    has_brief: boolean;
    score: number;
  };
}

export interface PipelineState {
  documents: PipelineDocument[];
  facts: DbExtractedFact[];
  evidence: EvidenceObject[];
  briefs: PipelineBrief[];
  snapshots: PipelineSnapshot[];
}

function emptyState(): PipelineState {
  return { documents: [], facts: [], evidence: [], briefs: [], snapshots: [] };
}

function keyFor(projectId: string) {
  return `${PREFIX}.${projectId}`;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadPipeline(projectId: string): PipelineState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return emptyState();
  }
}

export function savePipeline(projectId: string, state: PipelineState): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(keyFor(projectId), JSON.stringify(state));
  } catch {
    // quota — silently swallow; UI will reflect what fit
  }
}

export function clearPipeline(projectId: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(keyFor(projectId));
}

// --- Document helpers ------------------------------------------------------

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const FILENAME_TO_TYPE: Array<[RegExp, DocumentType]> = [
  [/contract|agreement|عقد|اتفاقية/i, "contract"],
  [/(monthly|progress|report)|تقرير|شهري/i, "monthly_progress_report"],
  [/bafo|best.?and.?final/i, "bafo"],
  [/(minutes|meeting)|محضر|اجتماع/i, "meeting_minutes"],
  [/invoice|فاتورة/i, "invoice"],
  [/technical|note|مذكرة/i, "technical_note"],
  [/(tender|bid|proposal)|عطاء|عرض/i, "tender_submission"],
  [/(criteria|evaluation|rfp)|معايير|تقييم/i, "evaluation_criteria"],
];

export function classifyByFilename(filename: string): {
  type: DocumentType;
  confidence: Confidence;
} {
  for (const [re, type] of FILENAME_TO_TYPE) {
    if (re.test(filename)) return { type, confidence: "HIGH" };
  }
  return { type: "unknown", confidence: "LOW" };
}

export function isTextLike(mime: string, filename: string): boolean {
  if (TEXT_MIME_TYPES.has(mime)) return true;
  return /\.(txt|md|csv|json|log)$/i.test(filename);
}

// Re-export so existing callers keep working; the implementation now
// lives in @/lib/utils/ids for reuse across store, extraction, brief.
export { newId } from "@/lib/utils/ids";

export async function readFilePreview(file: File): Promise<string | null> {
  if (!isTextLike(file.type, file.name)) return null;
  try {
    const text = await file.text();
    return text.slice(0, 2000);
  } catch {
    return null;
  }
}

export function formatBytes(n: number, locale: "en" | "ar" = "en"): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  const units =
    locale === "ar"
      ? ["بايت", "ك.ب", "م.ب", "ج.ب"]
      : ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  const formatted = i === 0 ? v.toFixed(0) : v.toFixed(1);
  return `${formatted} ${units[i]}`;
}
