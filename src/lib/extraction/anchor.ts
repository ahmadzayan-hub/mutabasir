// Anchoring extracted claims to the text that was actually read.
//
// Both extraction paths can produce a citation that is close to, but not
// literally in, the source: the deterministic baseline composes a
// representative sentence, and a model paraphrases. An evidence system
// cannot ship that. This pass re-anchors each claim's quote onto the best
// matching real line of the parsed document, so "show me the evidence"
// lands on text the reader can see. When nothing matches well enough the
// quote is left alone and the UI says the span could not be located.

import type { DbExtractedFact } from "@/types/database";

const MAX_QUOTE = 300;

/** Significant tokens: words over three characters, plus any number. */
export function significantTokens(text: string): string[] {
  const raw = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.,%-]*/gu) ?? [];
  return raw
    .map((tok) => tok.replace(/[.,]+$/, ""))
    .filter((tok) => tok.length > 3 || /\d/.test(tok));
}

/** Split into candidate lines: real lines first, then sentence fragments. */
export function candidateLines(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length < 12) continue;
    out.push(trimmed);
    if (trimmed.length > MAX_QUOTE) {
      for (const part of trimmed.split(/(?<=[.؟?!])\s+/)) {
        const p = part.trim();
        if (p.length >= 12 && p.length <= MAX_QUOTE) out.push(p);
      }
    }
  }
  return out;
}

export interface AnchorResult {
  quote: string;
  matched: boolean;
  score: number;
}

/**
 * Find the line in `documentText` that best supports `quote`.
 * Requires at least two shared significant tokens and a third of the
 * claim's tokens, so a weak coincidence never becomes a citation.
 */
export function anchorQuote(quote: string, documentText: string): AnchorResult {
  const original = quote.trim();
  if (!original || !documentText) return { quote: original, matched: false, score: 0 };

  if (documentText.includes(original)) return { quote: original, matched: true, score: 1 };

  const wanted = new Set(significantTokens(original));
  if (wanted.size === 0) return { quote: original, matched: false, score: 0 };

  let best = "";
  let bestHits = 0;
  for (const line of candidateLines(documentText)) {
    const lineTokens = new Set(significantTokens(line));
    let hits = 0;
    for (const tok of wanted) if (lineTokens.has(tok)) hits += 1;
    // Prefer the shorter line when two match equally: it is the tighter citation.
    if (hits > bestHits || (hits === bestHits && hits > 0 && line.length < best.length)) {
      best = line;
      bestHits = hits;
    }
  }

  const ratio = bestHits / wanted.size;
  if (bestHits >= 2 && ratio >= 1 / 3 && best) {
    return { quote: best.slice(0, MAX_QUOTE), matched: true, score: ratio };
  }
  return { quote: original, matched: false, score: ratio };
}

/**
 * Re-anchor a batch of facts against their own source documents.
 * Facts whose document text is unavailable are returned untouched.
 */
export function anchorFacts(
  facts: DbExtractedFact[],
  documentTexts: Record<string, string>,
): { facts: DbExtractedFact[]; anchored: number } {
  let anchored = 0;
  const out = facts.map((f) => {
    const text = documentTexts[f.document_id];
    if (!text || !f.citation_quote) return f;
    const res = anchorQuote(f.citation_quote, text);
    if (!res.matched || res.quote === f.citation_quote) return f;
    anchored += 1;
    return { ...f, citation_quote: res.quote };
  });
  return { facts: out, anchored };
}
