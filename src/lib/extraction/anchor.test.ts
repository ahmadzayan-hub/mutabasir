import { describe, expect, it } from "vitest";
import {
  anchorFacts,
  anchorQuote,
  candidateLines,
  quotedNumbers,
  significantTokens,
  unsupportedNumbers,
} from "./anchor";
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

describe("reconciling a claim against the text it cites", () => {
  it("reads every number out of a quote regardless of formatting", () => {
    const n = quotedNumbers("Total AED 12,400,000 over 18 months, 5% retention");
    expect(n.has("12400000")).toBe(true);
    expect(n.has("18")).toBe(true);
    expect(n.has("5")).toBe(true);
  });

  it("flags a payload figure the citation does not contain", () => {
    const bad = unsupportedNumbers(
      { amount: 12_450_000, currency: "AED" },
      "The total contract value is AED 12,400,000 inclusive of all taxes.",
    );
    expect(bad).toEqual(["amount"]);
  });

  it("stays silent when the figure is there", () => {
    const bad = unsupportedNumbers(
      { amount: 12_400_000, currency: "AED" },
      "The total contract value is AED 12,400,000 inclusive of all taxes.",
    );
    expect(bad).toEqual([]);
  });

  it("ignores non-numeric and non-integer payload values", () => {
    const bad = unsupportedNumbers(
      { jurisdiction: "United Arab Emirates", rate: 4.5, months: 18 },
      "The Term continues for eighteen (18) calendar months.",
    );
    expect(bad).toEqual([]);
  });

  it("says nothing when the citation carries no numbers at all", () => {
    // A quote with no digits cannot contradict a figure; flagging here
    // would fire on every qualitative citation and train people to ignore it.
    const bad = unsupportedNumbers({ amount: 12_450_000 }, "Governed by the laws of the UAE.");
    expect(bad).toEqual([]);
  });

  it("downgrades a fact whose own evidence contradicts it", () => {
    const doc = "The total contract value is AED 12,400,000 inclusive of all taxes.";
    const f = mkFact("The total contract value shall be AED 12,450,000 inclusive of all taxes.");
    f.payload_json = { amount: 12_450_000, currency: "AED" };
    f.confidence = "HIGH";

    const { facts, unsupported } = anchorFacts([f], { doc_1: doc });

    expect(unsupported).toBe(1);
    expect(facts[0]!.citation_quote).toContain("12,400,000");
    expect(facts[0]!.unsupported_claims).toEqual(["amount"]);
    expect(facts[0]!.confidence).toBe("LOW");
  });

  it("leaves a fact alone when claim and citation agree", () => {
    const doc = "The total contract value is AED 12,400,000 inclusive of all taxes.";
    const f = mkFact("The total contract value shall be AED 12,400,000 inclusive of all taxes.");
    f.payload_json = { amount: 12_400_000, currency: "AED" };
    f.confidence = "HIGH";

    const { facts, unsupported } = anchorFacts([f], { doc_1: doc });

    expect(unsupported).toBe(0);
    expect(facts[0]!.unsupported_claims).toBeUndefined();
    expect(facts[0]!.confidence).toBe("HIGH");
  });
});

describe("scaled shorthand is not a contradiction", () => {
  it("reads 1.24bn as 1,240,000,000", () => {
    const n = quotedNumbers("Awarded value AED 1.24bn; variations +3.2%.");
    expect(n.has("1240000000")).toBe(true);
  });

  it("does not flag a payload written in full against a quote written in shorthand", () => {
    const bad = unsupportedNumbers(
      { amount: 1_240_000_000, currency: "AED", change_orders_pct: 3.2 },
      "Awarded value AED 1.24bn; cumulative variation orders +3.2% of contract sum.",
    );
    expect(bad).toEqual([]);
  });

  it("handles k and m as well", () => {
    expect(quotedNumbers("a 250k retainer").has("250000")).toBe(true);
    expect(quotedNumbers("a 4.5m budget").has("4500000")).toBe(true);
  });
});
