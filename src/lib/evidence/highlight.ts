// Locating a claim inside its source text.
//
// The Evidence Split View answers one question: "show me exactly where this
// came from". That is a pure text problem, kept out of the component so it
// can be tested and reused (a PDF page renderer will call the same code).

export interface EvidenceSpan {
  /** Text before the located quote. */
  before: string;
  /** The located quote itself (empty when not found). */
  match: string;
  /** Text after the located quote. */
  after: string;
  /** How the span was found. */
  strategy: "locator" | "quote" | "none";
  start: number;
  end: number;
}

export interface LocateInput {
  documentText: string | undefined;
  locator?: { char_start?: number | null; char_end?: number | null } | null;
  /** Verbatim quote, used when the locator is absent or stale. */
  quote?: string | null;
}

function spanAt(text: string, start: number, end: number, strategy: "locator" | "quote"): EvidenceSpan {
  return {
    before: text.slice(0, start),
    match: text.slice(start, end),
    after: text.slice(end),
    strategy,
    start,
    end,
  };
}

/**
 * Find the claim's span in the source text. The locator is trusted first, but
 * only when it still points at real text; otherwise we fall back to the
 * verbatim quote, and finally report that nothing could be located rather
 * than highlighting something arbitrary.
 */
export function locateEvidence({ documentText, locator, quote }: LocateInput): EvidenceSpan {
  const text = documentText ?? "";
  const empty: EvidenceSpan = { before: text, match: "", after: "", strategy: "none", start: -1, end: -1 };
  if (!text) return empty;

  const start = locator?.char_start;
  const end = locator?.char_end;
  if (
    typeof start === "number" &&
    typeof end === "number" &&
    start >= 0 &&
    end > start &&
    end <= text.length
  ) {
    // A locator that no longer matches its quote is stale, not authoritative.
    const candidate = text.slice(start, end);
    if (!quote || candidate.trim() === quote.trim()) return spanAt(text, start, end, "locator");
  }

  const q = quote?.trim();
  if (q) {
    const idx = text.indexOf(q);
    if (idx >= 0) return spanAt(text, idx, idx + q.length, "quote");
  }

  return empty;
}

/**
 * Trim a long source text around the located span so the reader lands on the
 * evidence instead of scrolling a wall of text. Returns the same shape, with
 * ellipses folded into `before`/`after`.
 */
export function windowAround(span: EvidenceSpan, radius = 900): EvidenceSpan {
  if (span.strategy === "none") {
    return { ...span, before: span.before.slice(0, radius * 2) };
  }
  const beforeCut = Math.max(0, span.before.length - radius);
  const before = (beforeCut > 0 ? "…" : "") + span.before.slice(beforeCut);
  const after = span.after.slice(0, radius) + (span.after.length > radius ? "…" : "");
  return { ...span, before, after };
}
