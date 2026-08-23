"use client";

import { CheckCheck } from "lucide-react";
import type { DbExtractedFact } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";
import { describeFactType, formatFactPayload } from "@/lib/extraction/mock-extractor";
import { cn } from "@/lib/utils/cn";

interface Props {
  fact: DbExtractedFact;
  documents?: PipelineDocument[];
  locale: "en" | "ar";
  pageLabel: (n: number) => string;
  verified?: boolean;
  onToggleVerified?: (id: string) => void;
  verifyLabel?: string;
  verifiedLabel?: string;
  compact?: boolean;
}

const CONFIDENCE_TONE: Record<string, string> = {
  HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
};

export function FactItem({
  fact,
  documents,
  locale,
  pageLabel,
  verified,
  onToggleVerified,
  verifyLabel,
  verifiedLabel,
  compact = false,
}: Props) {
  const meta = describeFactType(fact.fact_type, locale);
  const doc = documents?.find((d) => d.id === fact.document_id);
  const tone = CONFIDENCE_TONE[fact.confidence] ?? CONFIDENCE_TONE.LOW;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white",
        compact ? "border-slate-200/70 p-3" : "border-slate-200 p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {meta.label}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatFactPayload(fact.fact_type, fact.payload_json, locale)}
          </p>
          {fact.citation_quote && (
            <p className="mt-2 border-s-2 border-slate-200 ps-2 text-[11px] italic leading-relaxed text-slate-500">
              &ldquo;{fact.citation_quote}&rdquo;
              {fact.citation_page ? ` · ${pageLabel(fact.citation_page)}` : ""}
              {doc ? ` · ${doc.filename}` : ""}
            </p>
          )}
          {fact.evidence_id && (
            <p
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500"
              title={fact.evidence_id}
              dir="ltr"
            >
              {fact.evidence_id.slice(0, 3)}…{fact.evidence_id.slice(-6)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              tone,
            )}
          >
            {fact.confidence}
          </span>
          {onToggleVerified && (
            <button
              type="button"
              onClick={() => onToggleVerified(fact.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                verified
                  ? "bg-brand-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {verified ? (
                <>
                  <CheckCheck className="h-2.5 w-2.5" />
                  {verifiedLabel ?? "Verified"}
                </>
              ) : (
                verifyLabel ?? "Verify"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
