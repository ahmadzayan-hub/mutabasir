"use client";
// Evidence Split View — Mutabasir's signature interface.
//
// Left: what the intelligence claims. Right: the source, opened at the exact
// span the claim came from. Selecting a claim moves the source, never the
// other way around, so "show me the evidence" is one click and always lands
// on a real location (or says plainly that it could not).
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Quote } from "lucide-react";
import { Section, Empty } from "@/components/ui/section";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils/cn";
import { describeFactType, formatFactPayload } from "@/lib/extraction/mock-extractor";
import { locateEvidence, windowAround } from "@/lib/evidence/highlight";
import type { EvidenceObject } from "@/lib/evidence/evidence";
import type { DbExtractedFact } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";

interface Props {
  facts: DbExtractedFact[];
  evidence: EvidenceObject[];
  documents: PipelineDocument[];
  /** Parsed text per document id. Not persisted, so it can legitimately be empty. */
  documentTexts: Record<string, string>;
}

export function EvidenceSplitView({ facts, evidence, documents, documentTexts }: Props) {
  const { t, locale } = useLocale();
  const e = t.pipeline.evidence;

  const cited = useMemo(() => facts.filter((f) => f.evidence_id), [facts]);
  const byId = useMemo(
    () => new Map(evidence.map((ev) => [ev.evidence_id, ev])),
    [evidence],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const markRef = useRef<HTMLElement | null>(null);

  // Keep the selection valid when extraction re-runs and mints new ids.
  useEffect(() => {
    const first = cited[0]?.evidence_id ?? null;
    setActiveId((current) =>
      current && cited.some((f) => f.evidence_id === current) ? current : first,
    );
  }, [cited]);

  const activeFact = cited.find((f) => f.evidence_id === activeId) ?? null;
  const activeEvidence = activeId ? byId.get(activeId) ?? null : null;
  const activeDoc = documents.find((d) => d.id === activeFact?.document_id) ?? null;
  const documentText = activeFact ? documentTexts[activeFact.document_id] : undefined;

  const span = useMemo(
    () =>
      windowAround(
        locateEvidence({
          documentText,
          locator: activeEvidence?.locator,
          quote: activeFact?.citation_quote,
        }),
      ),
    [documentText, activeEvidence, activeFact],
  );

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeId, span.strategy]);

  async function copyId() {
    if (!activeId) return;
    try {
      await navigator.clipboard.writeText(activeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (cited.length === 0) {
    return (
      <Section
        icon={<Quote className="h-4 w-4 text-brand-gold" />}
        title={e.title}
        hint={e.subtitle}
      >
        <Empty icon={<Quote className="h-4 w-4" />} title={e.empty} />
      </Section>
    );
  }

  return (
    <Section
      icon={<Quote className="h-4 w-4 text-brand-gold" />}
      title={e.title}
      hint={e.subtitle}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Claims */}
        <div className="min-w-0">
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {e.intelligence}
          </h3>
          <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pe-1" role="listbox" aria-label={e.intelligence}>
            {cited.map((f) => {
              const selected = f.evidence_id === activeId;
              const meta = describeFactType(f.fact_type, locale);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => setActiveId(f.evidence_id ?? null)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-start transition-colors",
                      selected
                        ? "border-brand-navy bg-brand-navy/[0.04]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-slate-900">
                      {formatFactPayload(f.fact_type, f.payload_json, locale)}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-slate-400" dir="ltr">
                      {f.evidence_id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Source */}
        <div className="min-w-0">
          <h3 className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            {e.source}
            {activeDoc && (
              <span className="font-normal normal-case tracking-normal text-slate-600">
                {activeDoc.filename}
              </span>
            )}
            {activeEvidence?.page != null && (
              <span className="font-normal normal-case tracking-normal text-slate-400">
                {t.pipeline.extract.page.replace("{n}", String(activeEvidence.page))}
              </span>
            )}
          </h3>

          {activeFact?.unsupported_claims?.length ? (
            // The claim contradicts the text it cites. This sits above the
            // source panel, not beside the claim, because the reader is about
            // to look at the evidence -- this is the moment they need to know
            // the two disagree.
            <p
              role="alert"
              className="mb-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-900"
            >
              {e.contradicted}
              <span className="mt-1 block font-medium">
                {e.contradictedField}:{" "}
                {activeFact.unsupported_claims
                  .map((k) => `${k} = ${String(activeFact.payload_json?.[k] ?? "")}`)
                  .join(" · ")}
              </span>
            </p>
          ) : null}

          {!documentText ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              {e.noText}
            </p>
          ) : (
            <>
              {span.strategy === "none" && (
                <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {e.notLocated}
                  {activeFact?.citation_quote && (
                    <span className="mt-1 block italic">
                      &ldquo;{activeFact.citation_quote}&rdquo;
                    </span>
                  )}
                </p>
              )}
              <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-[13px] leading-relaxed text-slate-700">
                <p className="whitespace-pre-wrap break-words">
                  {span.before}
                  {span.match && (
                    <mark
                      ref={markRef}
                      className="rounded bg-brand-gold/30 px-0.5 py-px font-medium text-slate-900 ring-1 ring-brand-gold/50"
                    >
                      {span.match}
                    </mark>
                  )}
                  {span.after}
                </p>
              </div>
            </>
          )}

          {activeEvidence && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>
                {e.idLabel}:{" "}
                <span className="font-mono text-slate-700" dir="ltr">
                  {activeEvidence.evidence_id}
                </span>
              </span>
              <span>
                {e.confidence}: {Math.round(activeEvidence.confidence * 100)}%
              </span>
              <span className="uppercase">{activeEvidence.classification}</span>
              <button
                type="button"
                onClick={copyId}
                className="rounded-full border border-slate-200 px-2 py-0.5 transition-colors hover:border-slate-400 hover:text-slate-700"
              >
                {copied ? e.copied : e.copyId}
              </button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
