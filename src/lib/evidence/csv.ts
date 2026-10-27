import type { EvidenceObject } from "./evidence";

export const EVIDENCE_CSV_HEADER = [
  "evidence_id",
  "source_document_id",
  "source_version",
  "source_type",
  "page",
  "section",
  "paragraph",
  "table",
  "row",
  "cell",
  "char_start",
  "char_end",
  "extracted_text",
  "source_hash",
  "extractor_version",
  "confidence",
  "classification",
  "created_at",
] as const;

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function evidenceToCsv(objects: readonly EvidenceObject[]): string {
  const rows = objects.map((o) => {
    const loc = o.locator;
    return [
      o.evidence_id,
      o.source_document_id,
      o.source_version,
      o.source_type,
      o.page,
      o.section,
      loc?.paragraph,
      loc?.table,
      loc?.row,
      loc?.cell,
      loc?.char_start,
      loc?.char_end,
      o.extracted_text,
      o.source_hash,
      o.extractor_version,
      o.confidence,
      o.classification,
      o.created_at,
    ].map(cell).join(",");
  });
  return [EVIDENCE_CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}
