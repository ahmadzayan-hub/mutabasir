import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/llm/web-llm", () => ({ getLoadedModelId: vi.fn(), chat: vi.fn() }));
import { chat, getLoadedModelId } from "@/lib/llm/web-llm";
import { extractFactsWithLlm, type LlmExtractInput } from "./llm-extractor";

const firstQuote = "The synthetic Alpha contract value is AED 100.";
const secondQuote = "The synthetic Beta contract value is AED 200.";
function input(): LlmExtractInput {
  return {
    projectId: "synthetic-project", subject: "contract_management", authorityEn: null, counterpartyEn: null,
    documents: ["alpha", "beta"].map((id) => ({ id, project_id: "synthetic-project", filename: `${id}.txt`, mime_type: "text/plain", size_bytes: 200, document_type: "contract", classification_confidence: "HIGH", preview_text: null, created_at: "2026-11-08" })),
    documentTexts: { alpha: `${firstQuote} Synthetic test document, containing no customer records.`, beta: `${secondQuote} Synthetic test document, containing no customer records.` },
  };
}
function fact(quote: string, amount = 200) {
  return { fact_type: "contract_value", payload: { amount, currency: "AED" }, citation_quote: quote, citation_page: 1, confidence: "HIGH" };
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getLoadedModelId).mockReturnValue("synthetic-model"); });

describe("model fact source attribution", () => {
  it("binds a second-document quotation to its actual document, not the first upload", async () => {
    vi.mocked(chat).mockResolvedValue(JSON.stringify([fact(secondQuote), fact(firstQuote, 100)]));
    const result = await extractFactsWithLlm(input());
    expect(result.used_llm).toBe(true);
    expect(result.facts.map((f) => f.document_id)).toEqual(["beta", "alpha"]);
    expect(result.facts.every((f) => !f.user_verified && f.origin === "llm")).toBe(true);
  });
  it("normalizes extraction whitespace while retaining the supplied quotation", async () => {
    const source = input(); source.documentTexts.beta = source.documentTexts.beta!.replace("contract value", "contract\n  value");
    vi.mocked(chat).mockResolvedValue(JSON.stringify([fact(secondQuote)]));
    const result = await extractFactsWithLlm(source);
    expect(result.facts[0]).toMatchObject({ document_id: "beta", citation_quote: secondQuote, origin: "llm" });
  });
  it.each(["missing", "ambiguous", "unselected", "truncated", "partial", "empty-quote", "invalid-payload"])("fails the whole batch closed for %s attribution", async (kind) => {
    const source = input(); let facts: unknown[] = [fact(secondQuote)];
    if (kind === "missing") facts = [fact("Invented quote not in any document")];
    if (kind === "ambiguous") source.documentTexts.alpha += secondQuote;
    if (kind === "unselected") { source.documents = source.documents.slice(0, 1); }
    if (kind === "truncated") source.documentTexts.beta = "x".repeat(6_000) + secondQuote;
    if (kind === "partial") facts.push(fact("Invented quote"));
    if (kind === "empty-quote") facts = [fact("")];
    if (kind === "invalid-payload") facts = [{ ...fact(secondQuote), payload: [] }];
    vi.mocked(chat).mockResolvedValue(JSON.stringify(facts));
    const result = await extractFactsWithLlm(source);
    expect(result.used_llm).toBe(false);
    expect(result.fallback_reason).toBe("source_attribution_failed");
    expect(result.facts.every((f) => f.origin === "template" && f.confidence === "LOW" && !f.user_verified)).toBe(true);
  });
  it("does not use unselected text to bypass the no-text check", async () => {
    const source = input(); source.documentTexts = { unrelated: "x".repeat(200) };
    const result = await extractFactsWithLlm(source);
    expect(result.fallback_reason).toBe("no_text_extracted");
    expect(chat).not.toHaveBeenCalled();
  });
  it("does not promote invalid page numbers", async () => {
    vi.mocked(chat).mockResolvedValue(JSON.stringify([{ ...fact(secondQuote), citation_page: -2.5 }]));
    expect((await extractFactsWithLlm(input())).facts[0]!.citation_page).toBeNull();
  });
});
