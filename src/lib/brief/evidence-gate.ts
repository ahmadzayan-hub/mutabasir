import type { DbExtractedFact } from '@/types/database';
import { quotedNumbers, unsupportedNumbers } from '@/lib/extraction/anchor';

// A binding to the exact claim/citation reviewed, not an authentication token.
export function reviewKey(f: DbExtractedFact): string {
  return JSON.stringify([f.project_id, f.document_id, f.fact_type, f.payload_json, f.citation_quote]);
}

function numericSupport(value: unknown, quote: string): boolean {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    const numbers = quotedNumbers(quote);
    const decimals = quote.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
    return (Number.isInteger(value) && numbers.has(String(value)))
      || decimals.some(n => Number(n.replaceAll(',', '')) === value);
  }
  if (Array.isArray(value)) return value.every(v => numericSupport(v, quote));
  if (value && typeof value === 'object') return Object.values(value).every(v => numericSupport(v, quote));
  return true;
}

// Citation integrity is necessary, never sufficient for semantic truth.
export function hasSource(f: DbExtractedFact, texts: Record<string, string>): boolean {
  const quote = f.citation_quote?.trim();
  return f.origin === 'llm' && !!quote && !!texts[f.document_id]?.includes(quote)
    && unsupportedNumbers(f.payload_json, quote).length === 0 && numericSupport(f.payload_json, quote);
}

export function reviewedFacts(facts: DbExtractedFact[], texts: Record<string, string>): boolean {
  return facts.length > 0 && facts.every(f => hasSource(f, texts)
    && f.user_verified && f.review_key === reviewKey(f));
}

export function canPublishBrief(
  facts: DbExtractedFact[], texts: Record<string, string>,
  brief: { evidence_key?: string; text_en: string; text_ar: string } | null,
): boolean {
  return !!brief && reviewedFacts(facts, texts)
    && brief.evidence_key === JSON.stringify([facts.map(reviewKey), brief.text_en, brief.text_ar]);
}
