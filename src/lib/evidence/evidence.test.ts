import { describe, expect, it } from "vitest";
import type { DocumentType } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";
import { runMockExtraction } from "@/lib/extraction/mock-extractor";
import {
  EXTRACTOR_VERSION,
  confidenceScore,
  mintEvidence,
  mintEvidenceForFacts,
  newEvidenceId,
  sha256Hex,
  sourceTypeFor,
  ulid,
  validateEvidence,
} from "./evidence";

function fakeDoc(
  id: string,
  filename: string,
  type: DocumentType = "unknown",
): PipelineDocument {
  return {
    id,
    project_id: "p_test",
    filename,
    mime_type: "application/pdf",
    size_bytes: 1000,
    document_type: type,
    classification_confidence: "MEDIUM",
    preview_text: null,
    created_at: new Date().toISOString(),
  };
}

describe("evidence ids", () => {
  it("ulid is 26 Crockford chars and time-ordered prefix", () => {
    const a = ulid(1_700_000_000_000);
    const b = ulid(1_800_000_000_000);
    expect(a).toHaveLength(26);
    expect(a.slice(0, 10) < b.slice(0, 10)).toBe(true);
  });

  it("newEvidenceId matches the contract pattern", () => {
    for (let i = 0; i < 20; i++) {
      expect(newEvidenceId()).toMatch(/^ev_[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/);
    }
  });
});

describe("hashing and mapping", () => {
  it("sha256Hex is deterministic and hex", async () => {
    const h1 = await sha256Hex("contract requires submission within 14 days");
    const h2 = await sha256Hex("contract requires submission within 14 days");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("other")).not.toBe(h1);
  });

  it("maps confidences to scores in [0,1]", () => {
    expect(confidenceScore("HIGH")).toBeGreaterThan(confidenceScore("MEDIUM"));
    expect(confidenceScore("MEDIUM")).toBeGreaterThan(confidenceScore("LOW"));
  });

  it("derives source_type from filename or mime", () => {
    expect(sourceTypeFor({ filename: "contract.pdf" })).toBe("pdf");
    expect(sourceTypeFor({ filename: "brief.docx" })).toBe("docx");
    expect(sourceTypeFor({ filename: "scores.xlsx" })).toBe("xlsx");
    expect(sourceTypeFor({ mime_type: "image/png" })).toBe("image");
    expect(sourceTypeFor({ filename: "notes.unknown" })).toBe("other");
  });
});

describe("minting", () => {
  it("every extracted fact gets a valid evidence object with matching id", async () => {
    const doc = fakeDoc("doc_1", "contract.pdf", "contract");
    const facts = runMockExtraction({
      projectId: "p_test",
      subject: "contract_management",
      documents: [doc],
      authorityEn: "RTA",
      counterpartyEn: "Contractor LLC",
    });
    expect(facts.length).toBeGreaterThan(0);

    const text = facts.map((f) => f.citation_quote).join("\n");
    const minted = await mintEvidenceForFacts({
      facts,
      documents: [doc],
      documentTexts: { doc_1: text },
    });

    expect(minted.evidence).toHaveLength(facts.length);
    for (let i = 0; i < minted.facts.length; i++) {
      const fact = minted.facts[i]!;
      const ev = minted.evidence[i]!;
      expect(fact.evidence_id).toBe(ev.evidence_id);
      expect(validateEvidence(ev)).toEqual([]);
      expect(ev.source_document_id).toBe(fact.document_id);
      expect(ev.extractor_version).toBe(EXTRACTOR_VERSION);
      expect(ev.classification).toBe("internal");
      expect(ev.access_policy?.owner_product).toBe("mutabasir");
    }
  });

  it("locator carries the char span of the verbatim quote", async () => {
    const doc = fakeDoc("doc_1", "contract.pdf");
    const documentText = "Preamble. The Contractor shall submit within 14 days. End.";
    const ev = await mintEvidence({
      fact: {
        id: "fact_1",
        document_id: "doc_1",
        project_id: "p_test",
        fact_type: "payment_terms",
        payload_json: { net_days: 14 },
        citation_page: 3,
        citation_quote: "submit within 14 days",
        confidence: "HIGH",
        user_verified: false,
        created_at: new Date().toISOString(),
      },
      document: doc,
      documentText,
    });
    expect(ev.page).toBe(3);
    expect(ev.locator?.char_start).toBe(documentText.indexOf("submit within 14 days"));
    expect(ev.locator?.char_end).toBe(
      (ev.locator?.char_start ?? 0) + "submit within 14 days".length,
    );
    expect(documentText.slice(ev.locator!.char_start!, ev.locator!.char_end!)).toBe(
      "submit within 14 days",
    );
  });

  it("same source text hashes identically across objects (dedup basis)", async () => {
    const doc = fakeDoc("doc_1", "a.pdf");
    const text = "identical source version";
    const base = {
      id: "f",
      document_id: "doc_1",
      project_id: "p",
      fact_type: "term",
      payload_json: {},
      citation_page: null,
      citation_quote: "identical source",
      confidence: "MEDIUM" as const,
      user_verified: false,
      created_at: new Date().toISOString(),
    };
    const e1 = await mintEvidence({ fact: base, document: doc, documentText: text });
    const e2 = await mintEvidence({ fact: { ...base, id: "g" }, document: doc, documentText: text });
    expect(e1.source_hash).toBe(e2.source_hash);
    expect(e1.evidence_id).not.toBe(e2.evidence_id);
  });

  it("mock path (no parsed text) still yields a schema-valid object", async () => {
    const doc = fakeDoc("doc_1", "photo.png");
    const ev = await mintEvidence({
      fact: {
        id: "f",
        document_id: "doc_1",
        project_id: "p",
        fact_type: "open_risk",
        payload_json: { title: "Late delivery", severity: "red" },
        citation_page: null,
        citation_quote: null,
        confidence: "LOW",
        user_verified: false,
        created_at: new Date().toISOString(),
      },
      document: doc,
      documentText: undefined,
    });
    expect(validateEvidence(ev)).toEqual([]);
    expect(ev.extracted_text).toContain("open_risk");
    expect(ev.locator).toBeNull();
  });
});

describe("validation guard", () => {
  it("flags contract violations", async () => {
    const doc = fakeDoc("doc_1", "a.pdf");
    const good = await mintEvidence({
      fact: {
        id: "f",
        document_id: "doc_1",
        project_id: "p",
        fact_type: "term",
        payload_json: {},
        citation_page: 2,
        citation_quote: "q",
        confidence: "HIGH",
        user_verified: false,
        created_at: new Date().toISOString(),
      },
      document: doc,
      documentText: "q",
    });
    expect(validateEvidence(good)).toEqual([]);
    expect(validateEvidence({ ...good, evidence_id: "bad" })).toContain("evidence_id format");
    expect(validateEvidence({ ...good, source_hash: "md5:x" })).toContain("source_hash format");
    expect(validateEvidence({ ...good, confidence: 1.5 })).toContain("confidence out of range");
    expect(validateEvidence({ ...good, page: 0 })).toContain(
      "page must be a positive integer or null",
    );
  });
});
