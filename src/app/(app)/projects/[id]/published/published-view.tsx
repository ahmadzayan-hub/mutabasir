"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  CheckCircle2,
  FileText,
  Maximize2,
  Minimize2,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleMarkdown } from "@/components/markdown/simple-markdown";
import { FactItem } from "@/components/facts/fact-item";
import { MetricRing } from "@/components/data-viz/metric-ring";
import { ConfidenceBar } from "@/components/data-viz/confidence-bar";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatDate } from "@/lib/utils/dates";
import { formatNumber, formatRatio } from "@/lib/utils/numbers";
import { cn } from "@/lib/utils/cn";
import type { DbProject } from "@/types/database";
import { loadPipeline, type PipelineState } from "@/lib/store/pipeline-store";
import {
  FACT_GROUP_ORDER,
  groupFactsByCategory,
} from "@/lib/extraction/grouping";

interface Props {
  project: DbProject;
}

export function PublishedView({ project }: Props) {
  const { t, locale, dir } = useLocale();
  const isAr = locale === "ar";
  const search = useSearchParams();
  const shouldPrint = search.get("print") === "1";
  const [presenter, setPresenter] = useState(false);

  const [state, setState] = useState<PipelineState | null>(null);
  useEffect(() => {
    setState(loadPipeline(project.id));
  }, [project.id]);

  useEffect(() => {
    if (!shouldPrint || !state) return;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [shouldPrint, state]);

  const brief = state?.briefs[0] ?? null;
  const snapshot = state?.snapshots[0] ?? null;

  const grouped = useMemo(
    () => groupFactsByCategory(state?.facts ?? [], locale),
    [state, locale],
  );

  const confidenceCounts = useMemo(() => {
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of state?.facts ?? []) {
      c[f.confidence] += 1;
    }
    return c;
  }, [state]);

  const authority =
    (isAr && project.client_authority_ar) || project.client_authority_en || "";
  const counterparty =
    (isAr && project.counterparty_ar) || project.counterparty_en || "";
  const pageLabel = (n: number) => t.pipeline.extract.page.replace("{n}", String(n));

  return (
    <div
      dir={dir}
      className={cn(
        "min-h-screen bg-slate-50 print:bg-white",
        presenter && "text-[110%]",
      )}
    >
      <div
        className={cn(
          "mx-auto px-3 py-5 sm:px-5 sm:py-10 print:max-w-none print:px-0 print:py-0",
          presenter ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <p className="mb-4 border border-amber-400 p-3">
          {isAr ? "نسخة محلية تجريبية، غير معتمدة مؤسسياً. لا يمكن إعادة التحقق من المصادر بعد إعادة التحميل؛ لا تستخدم لاتخاذ القرارات."
            : "LOCAL DEMO COPY — not organizationally approved. Sources cannot be revalidated after reload; do not use for decisions."}
        </p>
        {!shouldPrint && (
          <div className="mb-6 flex flex-wrap justify-end gap-2 print:hidden">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPresenter((v) => !v)}
              aria-pressed={presenter}
            >
              {presenter ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              {isAr
                ? presenter
                  ? "عرض عادي"
                  : "وضع العرض"
                : presenter
                  ? "Exit presenter"
                  : "Presenter mode"}
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              {t.pipeline.publish.print}
            </Button>
          </div>
        )}

        {state === null ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            {isAr ? "جارٍ التحميل…" : "Loading…"}
          </div>
        ) : !brief || !snapshot ? (
          <EmptyPublished project={project} />
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
          >
            {/* Hero cover */}
            <header className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-brand-navy via-brand-navy/95 to-brand-navy/90 px-5 py-7 text-white sm:px-8 sm:py-10 print:bg-white print:text-brand-navy">
              <div className="absolute inset-0 opacity-[0.06] print:hidden">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path
                        d="M 24 0 L 0 0 0 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  <span className="text-white/70 print:text-slate-500">
                    {isAr
                      ? "مُتابِصِر · لوحة المدير"
                      : "Mutabasir · Director's Lens"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-100 print:bg-emerald-50 print:text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.pipeline.publish.published}
                  </span>
                </div>
                <h1 className="display-tight mt-4 text-3xl font-bold sm:text-4xl">
                  {project.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85 print:text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                    {t.subjects[project.subject]}
                  </span>
                  {authority && (
                    <>
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                      <span>{authority}</span>
                    </>
                  )}
                  {counterparty && (
                    <>
                      <span aria-hidden className="opacity-40">
                        ↔
                      </span>
                      <span>{counterparty}</span>
                    </>
                  )}
                </div>
                <p className="mt-4 text-xs text-white/60 print:text-slate-500">
                  {isAr ? "صدر في" : "Published on"}{" "}
                  {formatDate(snapshot.created_at)}
                </p>
              </div>
            </header>

            {/* Key metrics band — quality ring + confidence distribution.
                Stacks vertically on mobile so nothing overflows on 360-wide
                screens; side-by-side from sm+. */}
            <section className="grid gap-5 border-b border-slate-100 bg-slate-50/60 px-5 py-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 sm:px-8 sm:py-6 print:bg-white">
              <div className="mx-auto sm:mx-0">
                <MetricRing
                  value={snapshot.quality.score / 5}
                  label={isAr ? "بوّابة الجودة" : "Quality gate"}
                  sublabel={formatRatio(snapshot.quality.score, 5, locale)}
                  tone={
                    snapshot.quality.score >= 4
                      ? "emerald"
                      : snapshot.quality.score >= 3
                        ? "gold"
                        : "amber"
                  }
                  locale={locale}
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {isAr ? "توزيع الثقة" : "Confidence mix"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatNumber(state.facts.length, locale)}{" "}
                    {isAr ? "واقعة" : state.facts.length === 1 ? "fact" : "facts"}{" "}
                    ·{" "}
                    {formatNumber(state.documents.length, locale)}{" "}
                    {isAr ? "مستند" : state.documents.length === 1 ? "document" : "documents"}
                  </p>
                </div>
                <ConfidenceBar
                  counts={confidenceCounts}
                  labels={
                    isAr
                      ? { HIGH: "مرتفعة", MEDIUM: "متوسّطة", LOW: "منخفضة" }
                      : undefined
                  }
                />
              </div>
            </section>

            {/* Executive summary */}
            <section className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
              <h2 className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-navy">
                <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                {isAr ? "الموجز التنفيذي" : "Executive brief"}
              </h2>
              <div
                dir={isAr ? "rtl" : "ltr"}
                className="text-sm leading-relaxed text-slate-800"
              >
                <SimpleMarkdown text={isAr ? brief.text_ar : brief.text_en} />
              </div>
            </section>

            {/* Facts grid */}
            <section className="grid gap-4 border-b border-slate-100 px-5 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8">
              {FACT_GROUP_ORDER.map((group) =>
                grouped[group].length === 0 ? null : (
                  <div key={group} className="space-y-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {t.pipeline.extract.groups[group]}
                    </h3>
                    <div className="space-y-2">
                      {grouped[group].map((f) => (
                        <FactItem
                          key={f.id}
                          fact={f}
                          locale={locale}
                          pageLabel={pageLabel}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </section>

            {/* Meta footer */}
            <footer className="px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {isAr ? "بوابة الجودة · " : "Quality gate · "}
                  <span className="font-semibold text-brand-navy">
                    {formatRatio(snapshot.quality.score, 5, locale)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {formatNumber(state.documents.length, locale)}{" "}
                  {isAr ? "مستند" : "document(s)"}
                </span>
                <span className="font-mono">
                  {isAr ? "كود اللقطة" : "Snapshot"}: {snapshot.share_token}
                </span>
              </div>
            </footer>
          </motion.article>
        )}
      </div>
    </div>
  );
}

function EmptyPublished({ project }: { project: DbProject }) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <FileText className="h-5 w-5" />
        </div>
        <h1 className="display-tight text-lg font-semibold text-brand-navy">
          {isAr ? "لا توجد لقطة منشورة بعد" : "No published snapshot yet"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {isAr
            ? "تُخزَّن لقطات النشر محلّياً في المتصفّح الذي أُنشئت منه. إن كنت تفتح هذا الرابط من جهازٍ آخر، أو نافذة خاصّة، أو مسحت بيانات الموقع، فلن تظهر اللقطة هنا. عد إلى صفحة المشروع وانشر لقطةً جديدة."
            : "Published snapshots live in the browser they were created on. If you're on a different device, in a private window, or cleared site data, the snapshot won't appear here. Return to the project and publish a fresh snapshot."}
        </p>
        <a
          href={`/projects/${project.id}`}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-navy/90"
        >
          {isAr ? "افتح المشروع" : "Open project"}
        </a>
      </div>
    </div>
  );
}
