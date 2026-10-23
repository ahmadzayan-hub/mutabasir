"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion/count-up";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export function LandingHero() {
  const { t, dir, locale } = useLocale();
  return (
    <section
      className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20"
      dir={dir}
    >
      <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-12">
        <Stagger className="lg:col-span-3" staggerChildren={0.1}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-navy sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
              {t.landing.eyebrow}
            </span>
          </StaggerItem>
          <StaggerItem>
            <h1 className="display-tight mt-5 text-balance text-3xl font-bold leading-[1.1] text-brand-navy sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.05]">
              {t.landing.heroTitle}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t.landing.heroBody}
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/sign-up">
                <Button size="lg">{t.landing.ctaPrimary}</Button>
              </Link>
              <Link href="#how">
                <Button variant="secondary" size="lg">
                  {t.landing.ctaSecondary}
                </Button>
              </Link>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm sm:gap-4">
              <Metric value={90} suffix={locale === "ar" ? " ث" : "s"} label={locale === "ar" ? "للنشر" : "to publish"} />
              <Metric value={12} suffix="" label={locale === "ar" ? "أقسام" : "sections"} />
              <Metric value={11} suffix="" label={locale === "ar" ? "بوابات" : "gates"} />
            </div>
          </StaggerItem>
        </Stagger>

        <div className="lg:col-span-2">
          <HeroDashboardCard />
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
      <div className="num display-tight text-xl font-bold text-brand-navy sm:text-2xl">
        <CountUp to={value} suffix={suffix} />
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-[11px]">
        {label}
      </div>
    </div>
  );
}

function HeroDashboardCard() {
  const { t, locale } = useLocale();
  const tiles =
    locale === "ar"
      ? [
          { label: "القيمة", value: "١٢٫٤م" },
          { label: "مفوتر", value: "٧٫٨م" },
          { label: "متبقّي", value: "٤٫٦م" },
        ]
      : [
          { label: "Value", value: "12.4M" },
          { label: "Invoiced", value: "7.8M" },
          { label: "Remaining", value: "4.6M" },
        ];
  const rows =
    locale === "ar"
      ? [
          { color: "bg-status-green", text: "التعبئة مكتملة" },
          { color: "bg-status-amber", text: "دراسة الجدوى تحت المراجعة" },
          { color: "bg-status-red", text: "مخاطر غرامة على المرحلة ٥" },
        ]
      : [
          { color: "bg-status-green", text: "Mobilisation complete" },
          { color: "bg-status-amber", text: "Feasibility study in review" },
          { color: "bg-status-red", text: "Penalty exposure on Phase 5" },
        ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-brand-navy/5 sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {t.landing.sample}
            </p>
            <p className="display-tight text-sm font-semibold text-brand-navy sm:text-base">
              {t.landing.sampleTitle}
            </p>
          </div>
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1"
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-status-amber"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="text-[11px] font-semibold text-amber-900">
              {t.landing.sampleStatus}
            </span>
          </motion.span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 sm:px-2.5"
            >
              <p className="text-[9px] font-medium text-slate-500 sm:text-[10px]">
                {tile.label}
              </p>
              <p className="num display-tight mt-0.5 text-xs font-bold text-brand-navy sm:text-sm">
                {locale === "ar" ? `${tile.value} د.إ` : `AED ${tile.value}`}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          {rows.map((row, i) => (
            <motion.div
              key={row.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.85 + i * 0.1 }}
              className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 sm:gap-2.5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
              <span className="text-[11px] text-slate-700 sm:text-xs">
                {row.text}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Left padding at sm+ keeps the footer text clear of the floating
            "Bilingual" badge anchored to the card's bottom-left corner. */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:pl-36">
          <span className="text-[10px] font-medium text-slate-500">
            {locale === "ar" ? "موثَّق من ١٦ مستنداً" : "Cited from 16 documents"}
          </span>
          <span className="text-[10px] font-semibold text-brand-navy">
            mutabasir.ae
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute -bottom-4 -left-4 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:flex sm:items-center sm:gap-2"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-navy text-[10px] font-bold text-white">
          {locale === "ar" ? "EN" : "ع"}
        </span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {locale === "ar" ? "ثنائي اللغة" : "Bilingual"}
          </p>
          <p
            dir={locale === "ar" ? "ltr" : "rtl"}
            lang={locale === "ar" ? "en" : "ar"}
            className="text-xs font-semibold text-brand-navy"
          >
            {locale === "ar" ? "Director's letter" : "رسالة المدير العام"}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
