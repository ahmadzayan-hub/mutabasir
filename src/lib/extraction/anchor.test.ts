import { describe, expect, it } from "vitest";
import { anchorFacts, anchorQuote, candidateLines, significantTokens } from "./anchor";
import type { DbExtractedFact } from "@/types/database";

const DOC = `CONTRACT AGREEMENT - PROJECT ALPHA

2. Contract Value
The total contract value is AED 12,400,000 inclusive of all taxes.

4. Payment Terms
Payment shall be made within 30 days of certified invoice. Retention of 5% applies to each payment.

6. Risks
Open risk: supply chain delays may affect the delivery milestone in Q3.`;

function mkFact(quote: string, documentId = "doc_1"): DbExtractedFact {
  return {
    id: "f_" + quote.slice(0, 4),
    project_id: "p",
    document_id: documentId,
    fact_type: "contract_value",
    payload_json: {},
    citation_page: 1,
    citation_quote: quote,
    confidence: "HIGH",
    user_verified: false,
    created_at: new Date().toISOString(),
  };
}

describe("token and line helpers", () => {
  it("keeps meaningful words and any number", () => {
    const toks = significantTokens("The value is AED 12,400,000 in 24 months");
    expect(toks).toContain("value");
    expect(toks).toContain("12,400,000");
    expect(toks).toContain("24");
    expect(toks).not.toContain("is");
  });

  it("skips trivially short lines", () => {
    expect(candidateLines("ok\n\nA properly long line of source text.")).toEqual([
      "A properly long line of source text.",
    ]);
  });
});

describe("anchorQuote", () => {
  it("keeps a quote that is already verbatim", () => {
    const r = anchorQuote("Retention of 5% applies to each payment.", DOC);
    expect(r.matched).toBe(true);
    expect(r.score).toBe(1);
  });

  it("re-anchors a paraphrase onto the real line", () => {
    const r = anchorQuote("Total contract value: AED 12,450,000 including taxes", DOC);
    expect(r.matched).toBe(true);
    expect(DOC).toContain(r.quote);
    expect(r.quote).toContain("12,400,000");
  });

  it("refuses a weak coincidence rather than inventing a citation", () => {
    const r = anchorQuote("Board approved the marketing plan for next year", DOC);
    expect(r.matched).toBe(false);
    expect(r.quote).toBe("Board approved the marketing plan for next year");
  });

  it("returns the original quote when there is no text to anchor against", () => {
    expect(anchorQuote("anything at all here", "").matched).toBe(false);
    expect(anchorQuote("", DOC).matched).toBe(false);
  });

  it("prefers the tighter line when two match equally", () => {
    const text = "Payment terms apply here.\nPayment terms apply here and also many other unrelated trailing words follow.";
    const r = anchorQuote("payment terms apply", text);
    expect(r.quote).toBe("Payment terms apply here.");
  });
});

describe("anchorFacts", () => {
  it("anchors what it can and reports how many changed", () => {
    const facts = [
      mkFact("Total contract value: AED 12,450,000 including taxes"),
      mkFact("Payment is due within 30 days of a certified invoice"),
      mkFact("Completely unrelated statement about staffing levels"),
    ];
    const res = anchorFacts(facts, { doc_1: DOC });
    expect(res.anchored).toBe(2);
    for (const f of res.facts.slice(0, 2)) {
      expect(DOC).toContain(f.citation_quote!);
    }
    expect(res.facts[2]!.citation_quote).toBe("Completely unrelated statement about staffing levels");
  });

  it("leaves facts untouched when their document text is unavailable", () => {
    const facts = [mkFact("Total contract value: AED 12,450,000", "doc_other")];
    const res = anchorFacts(facts, { doc_1: DOC });
    expect(res.anchored).toBe(0);
    expect(res.facts[0]).toBe(facts[0]);
  });
});
