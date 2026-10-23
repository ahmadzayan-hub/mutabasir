import { describe, expect, it } from "vitest";
import type { DocumentType, Subject } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";
import { runMockExtraction } from "./mock-extractor";
import { groupFactsByCategory, FACT_GROUP_ORDER } from "./grouping";
import { composeBrief, audienceOptions } from "@/lib/brief/composer";

const SUBJECTS: Subject[] = [
  "contract_management",
  "tender_evaluation",
  "operations_maintenance",
  "construction",
];

const AUDIENCES = audienceOptions().map((a) => a.id);

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

describe("pipeline end-to-end (deterministic path)", () => {
  it("runs extraction for every supported subject and produces cited facts", () => {
    for (const subject of SUBJECTS) {
      const facts = runMockExtraction({
        projectId: "p_test",
        subject,
        documents: [
          fakeDoc("d1", "contract-master.pdf", "contract"),
          fakeDoc("d2", "monthly-report-Q2.pdf", "monthly_progress_report"),
        ],
        authorityEn: "Government Authority",
        counterpartyEn: "Consulting Co.",
      });
      expect(facts.length, `${subject} produced no facts`).toBeGreaterThan(0);
      for (const f of facts) {
        expect(f.project_id).toBe("p_test");
        expect(f.fact_type).toBeTruthy();
        expect(f.payload_json).toBeTruthy();
        expect(["HIGH", "MEDIUM", "LOW"]).toContain(f.confidence);
      }
    }
  });

  it("groupFactsByCategory allocates every fact into a known group", () => {
    const facts = runMockExtraction({
      projectId: "p",
      subject: "contract_management",
      documents: [fakeDoc("d1", "contract.pdf")],
      authorityEn: "A",
      counterpartyEn: "B",
    });
    const grouped = groupFactsByCategory(facts, "en");
    const total =
      grouped.key_terms.length + grouped.performance.length + grouped.risk.length;
    expect(total).toBe(facts.length);
    for (const g of FACT_GROUP_ORDER) {
      expect(grouped[g]).toBeDefined();
    }
  });
});

describe("brief composer bilingual coverage", () => {
  it("produces non-empty EN + AR text for every subject × audience", () => {
    for (const subject of SUBJECTS) {
      const facts = runMockExtraction({
        projectId: "p",
        subject,
        documents: [fakeDoc("d1", "contract.pdf")],
        authorityEn: "Authority",
        counterpartyEn: "Counterparty",
      });
      for (const audience of AUDIENCES) {
        const brief = composeBrief({
          projectName: "Test Project",
          subject,
          audience,
          authorityEn: "Authority",
          authorityAr: "الجهة",
          counterpartyEn: "Counterparty",
          counterpartyAr: "الطرف",
          facts,
          locale: "en",
        });
        expect(
          brief.text_en.length,
          `EN empty for ${subject}/${audience}`,
        ).toBeGreaterThan(30);
        expect(
          brief.text_ar.length,
          `AR empty for ${subject}/${audience}`,
        ).toBeGreaterThan(30);
        expect(brief.audience_label_en).toBeTruthy();
        expect(brief.audience_label_ar).toBeTruthy();
      }
    }
  });
});

describe("numbers formatter integration", () => {
  it("Arabic renders Eastern-Indic digits", async () => {
    const { formatNumber, formatPercent } = await import("@/lib/utils/numbers");
    // Eastern-Arabic digit range U+0660..U+0669.
    expect(formatNumber(12345, "ar")).toMatch(/[٠-٩]/);
    expect(formatPercent(0.42, "ar")).toMatch(/[٠-٩]/);
    // English stays Latin.
    expect(formatNumber(12345, "en")).toMatch(/^12[,.]?345$/);
  });
});

describe("template facts never pass as high-confidence readings", () => {
  it("asTemplateFacts marks every template LOW and as a template", async () => {
    const { asTemplateFacts } = await import("./mock-extractor");
    const facts = asTemplateFacts(
      runMockExtraction({
        projectId: "prj_syn",
        subject: "contract_management",
        documents: [fakeDoc("d1", "contract-master.pdf", "contract")],
        authorityEn: "SYNTHETIC Authority",
        counterpartyEn: "SYNTHETIC Contractor",
      }),
    );
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every((f) => f.confidence === "LOW" && f.origin === "template")).toBe(true);
  });
});
