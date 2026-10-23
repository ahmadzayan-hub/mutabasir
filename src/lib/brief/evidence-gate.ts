import type { DbExtractedFact } from '@/types/database';

// A binding to the exact claim/citation reviewed, not an authentication token.
export function reviewKey(f: DbExtractedFact): string {
  return JSON.stringify([f.project_id, f.document_id, f.fact_type, f.payload_json, f.citation_quote]);
}

function numericSupport(value: unknown, quote: string): boolean {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    // Keep decimal points and signs; 1.2 must never support 12, nor -10 support 10.
    const scale: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, bn: 1e9, tn: 1e12 };
    const normalized = quote
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
      .replaceAll('٫', '.').replaceAll('٬', ',').replaceAll('−', '-');
    return Array.from(normalized.matchAll(/(?<![\w.,])[+-]?\d[\d,.]*(?:\s*(?:bn|tn|[kmb])\b)?/gi)).some(match => {
      const raw = match[0].replace(/\s/g, '');
      const suffix = raw.match(/(bn|tn|[kmb])$/i)?.[0].toLowerCase();
      // A sentence-ending full stop is punctuation, but interior decimals/grouping are not.
      const number = (suffix ? raw.slice(0, -suffix.length) : raw).replace(/\.$/, '');
      if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(number)) return false;
      const following = normalized.slice(match.index! + match[0].length);
      if (/^[\w,]/.test(following) || /^\.\d/.test(following) || /^\s*(?:million|billion|trillion|thousand|مليون|مليار)(?=\s|$)/i.test(following)) return false;
      return Number(number.replaceAll(',', '')) * (suffix ? scale[suffix]! : 1) === value;
    });
  }
  if (Array.isArray(value)) return value.every(v => numericSupport(v, quote));
  if (value && typeof value === 'object') return Object.values(value).every(v => numericSupport(v, quote));
  return true;
}

// Citation integrity is necessary, never sufficient for semantic truth.
export function hasSource(f: DbExtractedFact, texts: Record<string, string>): boolean {
  const quote = f.citation_quote?.trim();
  return f.origin === 'llm' && !!quote && !!texts[f.document_id]?.includes(quote)
    && numericSupport(f.payload_json, quote);
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
