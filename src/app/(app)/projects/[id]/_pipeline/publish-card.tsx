"use client";

import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { Section, Empty } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { PipelineBrief, PipelineSnapshot } from "@/lib/store/pipeline-store";
import { cn } from "@/lib/utils/cn";

export interface QualitySummary {
  has_documents: boolean;
  has_facts: boolean;
  has_brief: boolean;
  has_high: boolean;
  has_risk: boolean;
  score: number;
}

interface Props {
  snapshot: PipelineSnapshot | null;
  brief: PipelineBrief | null;
  projectId: string;
  quality: QualitySummary;
  evidenceReady: boolean;
  onPublish: () => void;
}

export function PublishCard({ snapshot, brief, projectId, quality, evidenceReady, onPublish }: Props) {
  const { t } = useLocale();
  const failing = 5 - quality.score;
  const canPublish = evidenceReady && quality.has_brief && quality.has_facts && quality.has_documents;

  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: quality.has_documents, label: t.pipeline.publish.checks.documents },
    { ok: quality.has_facts, label: t.pipeline.publish.checks.facts },
    { ok: quality.has_brief, label: t.pipeline.publish.checks.brief },
    { ok: quality.has_high, label: t.pipeline.publish.checks.highConfidence },
    { ok: quality.has_risk, label: t.pipeline.publish.checks.risk },
  ];

  return (
    <Section
      icon={<Globe className="h-4 w-4" />}
      title={t.pipeline.publish.title}
    >
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/60 to-white p-4">
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.pipeline.publish.quality}
          <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-brand-navy">
            {quality.score}/5
          </span>
        </div>
        <ul className="grid gap-1.5 text-sm md:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              {c.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
              <span className={c.ok ? "text-slate-700" : "text-slate-400"}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-medium">
          {failing === 0 ? (
            <span className="text-emerald-700">
              {t.pipeline.publish.qualityPass}
            </span>
          ) : (
            <span className="text-amber-700">
              {t.pipeline.publish.qualityFail.replace("{n}", String(failing))}
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={onPublish} disabled={!canPublish || !brief} size="sm">
          <Globe className="h-3.5 w-3.5" />
          {snapshot ? t.pipeline.publish.republish : t.pipeline.publish.publish}
        </Button>
        {snapshot && (
          <>
            <a
              href={`/projects/${projectId}/published`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                {t.pipeline.publish.open}
              </Button>
            </a>
            <a
              href={`/projects/${projectId}/published?print=1`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="ghost" size="sm">
                <Printer className="h-3.5 w-3.5" />
                {t.pipeline.publish.print}
              </Button>
            </a>
          </>
        )}
      </div>

      {snapshot && (
        <p
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700",
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {t.pipeline.publish.published} ·{" "}
          {new Date(snapshot.created_at).toLocaleString()}
        </p>
      )}
      {!brief && (
        <div className="mt-4">
          <Empty title={t.pipeline.publish.empty} />
        </div>
      )}
    </Section>
  );
}
