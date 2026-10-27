import { describe, expect, it } from "vitest";
import type { EvidenceObject } from "./evidence";
import { EVIDENCE_CSV_HEADER, evidenceToCsv } from "./csv";

const base: EvidenceObject = {
  evidence_id: "01J0000000ABCDEFGHJKMNPQRS",
  source_document_id: "doc-1",
  source_version: "v1",
  source_type: "pdf",
  page: 3,
  section: "Scope",
  locator: { paragraph: 2, table: null, row: null, cell: null, char_start: 10, char_end: 42 },
  extracted_text: "Plain text",
  source_hash: "abc",
  extractor_version: "mutabasir-extract@0.1.0",
  confidence: 0.9,
  classification: "internal",
  access_policy: null,
  created_at: "2026-10-27T00:00:00.000Z",
};

describe("evidenceToCsv", () => {
  it("writes the header and one row per evidence object", () => {
    const csv = evidenceToCsv([base, { ...base, evidence_id: "01J0000000ABCDEFGHJKMNPQRT" }]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(EVIDENCE_CSV_HEADER.join(","));
    expect(lines[1]).toBe(
      "01J0000000ABCDEFGHJKMNPQRS,doc-1,v1,pdf,3,Scope,2,,,,10,42,Plain text,abc,mutabasir-extract@0.1.0,0.9,internal,2026-10-27T00:00:00.000Z",
    );
  });

  it("quotes commas, quotes and newlines and doubles embedded quotes", () => {
    const csv = evidenceToCsv([
      { ...base, extracted_text: 'Fee, "net"\nsecond line', section: null, locator: null },
    ]);
    const row = csv.split("\r\n").slice(1).join("\r\n");
    expect(row.startsWith('01J0000000ABCDEFGHJKMNPQRS,doc-1,v1,pdf,3,,,,,,,,"Fee, ""net""\nsecond line"')).toBe(true);
  });

  it("returns only the header for an empty document", () => {
    expect(evidenceToCsv([])).toBe(EVIDENCE_CSV_HEADER.join(",") + "\r\n");
  });

  it("renders null locator fields as empty cells", () => {
    const csv = evidenceToCsv([{ ...base, locator: null, page: null }]);
    const fields = csv.split("\r\n")[1]!.split(",");
    expect(fields[4]).toBe("");
    expect(fields[10]).toBe("");
    expect(fields[11]).toBe("");
  });
});
