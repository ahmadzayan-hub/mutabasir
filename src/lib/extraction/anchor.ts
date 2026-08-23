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
/**
 * Numbers a quote actually contains, normalised so "12,450,000",
 * "12450000" and "AED 12,450,000" all compare equal.
 */
export function quotedNumbers(quote: string): Set<string> {
  const out = new Set<string>();

  // Scaled shorthand first: "AED 1.24bn" and "1,240,000,000" are the same
  // figure, and flagging that pair as a contradiction would be a false
  // alarm -- the kind that teaches people to ignore the flag.
  const SCALE: Record<string, number> = { k: 1e3, m: 1e6, bn: 1e9, b: 1e9, tn: 1e12 };
  for (const m of quote.matchAll(/(\d+(?:\.\d+)?)\s*(bn|tn|[kmb])\b/gi)) {
    const scaled = Number(m[1]) * (SCALE[m[2]!.toLowerCase()] ?? 1);
    if (Number.isFinite(scaled) && Number.isInteger(scaled)) out.add(String(scaled));
  }

  for (const m of quote.matchAll(/\d[\d,._\s]*\d|\d/g)) {
    const digits = m[0].replace(/[^\d]/g, "");
    if (digits) out.add(String(Number(digits)));
  }
  return out;
}

/**
 * Payload keys whose numeric value does not appear in the citation.
 *
 * This is the check that stops an evidence product from asserting a figure
 * its own evidence does not contain. Extraction produces a payload and a
 * quote independently -- the deterministic baseline composes both, and a
 * model can paraphrase one without the other -- so the two can disagree.
 * When they do, the claim is not supported by the text the reader is being
 * shown, and saying so is the whole job.
 *
 * Only whole numbers are compared. Dates, percentages written in words and
 * free text are left to the reader; a false "unsupported" flag would be
 * worse than none, because it teaches people to ignore the flag.
 */
export function unsupportedNumbers(
  payload: Record<string, unknown>,
  quote: string,
): string[] {
  if (!quote) return [];
  const inQuote = quotedNumbers(quote);
  if (inQuote.size === 0) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (!Number.isInteger(value)) continue;
    if (!inQuote.has(String(value))) out.push(key);
  }
  return out;
}

export function anchorFacts(
  facts: DbExtractedFact[],
  documentTexts: Record<string, string>,
): { facts: DbExtractedFact[]; anchored: number; unsupported: number } {
  let anchored = 0;
  let unsupported = 0;
  const out = facts.map((f) => {
    const text = documentTexts[f.document_id];
    if (!text || !f.citation_quote) return f;

    const res = anchorQuote(f.citation_quote, text);
    const quote = res.matched ? res.quote : f.citation_quote;
    if (res.matched && res.quote !== f.citation_quote) anchored += 1;

    // Reconcile the claim against the text it now points at. A fact whose
    // own citation contradicts it must not be presented as a fact.
    const bad = unsupportedNumbers(f.payload_json, quote);
    if (bad.length === 0) {
      return quote === f.citation_quote ? f : { ...f, citation_quote: quote };
    }
    unsupported += 1;
    return {
      ...f,
      citation_quote: quote,
      unsupported_claims: bad,
      confidence: "LOW" as DbExtractedFact["confidence"],
    };
  });
  return { facts: out, anchored, unsupported };
}
