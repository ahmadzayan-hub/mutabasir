"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  FolderPlus,
  Search,
  Sparkles,
  FileText,
  ScrollText,
  Wand2,
  Wrench,
  HardHat,
} from "lucide-react";
import type { Subject } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PulseDot } from "@/components/motion/pulse-dot";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { DbProject } from "@/types/database";
import { seedDemoAction } from "../new/actions";

type Filter = "all" | Subject;

const SUBJECT_ICON: Record<Subject, typeof FileText> = {
  contract_management: FileText,
  tender_evaluation: ScrollText,
  operations_maintenance: Wrench,
  construction: HardHat,
};

export function ProjectsView({ projects }: { projects: DbProject[] }) {
  const { t, dir, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter !== "all" && p.subject !== filter) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.client_authority_en,
        p.client_authority_ar,
        p.counterparty_en,
        p.counterparty_ar,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [projects, query, filter]);

  const isFiltering = query.trim() !== "" || filter !== "all";
  const clearFilters = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <div dir={dir}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-tight text-2xl font-bold text-brand-navy sm:text-3xl md:text-4xl"
          >
            {t.projects.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-sm text-slate-500"
          >
            {t.projects.subtitle}
          </motion.p>
        </div>
        <Link href="/new">
          <Button>
            <FolderPlus className="h-4 w-4" />
            {t.projects.newProject}
          </Button>
        </Link>
      </div>

      {projects.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
                dir === "rtl" ? "right-3" : "left-3",
              )}
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.projects.search}
              aria-label={t.projects.search}
              className={dir === "rtl" ? "pr-9" : "pl-9"}
            />
          </div>
          <div
            role="group"
            aria-label={t.projects.filterLabel}
            className="-mx-1 flex max-w-full overflow-x-auto px-1 sm:mx-0 sm:px-0"
          >
            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 text-sm">
              {(
                [
                  { id: "all", label: t.projects.filterAll },
                  { id: "contract_management", label: t.projects.filterContract },
                  { id: "tender_evaluation", label: t.projects.filterTender },
                  { id: "operations_maintenance", label: t.projects.filterOps },
                  { id: "construction", label: t.projects.filterConstruction },
                ] as { id: Filter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  aria-pressed={filter === tab.id}
                  className={cn(
                    "relative h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors sm:text-sm",
                    filter === tab.id
                      ? "text-brand-navy"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {filter === tab.id && (
                    <motion.span
                      layoutId="filter-pill"
                      className="absolute inset-0 -z-0 rounded-md bg-brand-navy/10"
                      transition={{
                        type: "spring",
                        stiffness: 360,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <p
          aria-live="polite"
          className={cn("text-xs text-slate-500", isFiltering && "mb-3")}
        >
          {isFiltering
            ? t.projects.resultCount
                .replace("{shown}", String(filtered.length))
                .replace("{total}", String(projects.length))
            : null}
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center text-sm text-slate-500">
            <p>{t.projects.noResults}</p>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              {t.projects.clearFilters}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/projects/${project.id}` as never}>
                <motion.div
                  whileHover={{ x: dir === "rtl" ? -4 : 4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardBody className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <PulseDot status={project.status} />
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {(() => {
                              const Icon = SUBJECT_ICON[project.subject];
                              return <Icon className="h-3 w-3" />;
                            })()}
                            {t.subjects[project.subject]}
                          </span>
                          <h2 className="display-tight truncate text-base font-semibold text-brand-navy sm:text-lg">
                            {project.name}
                          </h2>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                          <span>
                            {t.projects.created}:{" "}
                            <span className="text-slate-700">
                              {formatDate(project.created_at)}
                            </span>
                          </span>
                          {project.client_authority_en && (
                            <span>
                              {t.projects.authority}:{" "}
                              <span className="text-slate-700">
                                {locale === "ar" && project.client_authority_ar
                                  ? project.client_authority_ar
                                  : project.client_authority_en}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 text-slate-400",
                          dir === "rtl" && "rotate-180",
                        )}
                      />
                    </CardBody>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t, locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardBody className="relative overflow-hidden py-14 text-center sm:py-20">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-navy/5 blur-2xl" />
          <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-brand-gold/10 blur-2xl" />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-navy text-white shadow-lg"
          >
            <Sparkles className="h-7 w-7" />
          </motion.div>
          <p className="relative mt-6 text-base font-medium text-slate-800">
            {t.projects.empty}
          </p>
          <p className="relative mx-auto mt-1 max-w-md text-sm text-slate-500">
            {t.projects.emptyHint}
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/new">
              <Button size="lg">
                <FolderPlus className="h-4 w-4" />
                {t.projects.newProject}
              </Button>
            </Link>
            <form action={seedDemoAction}>
              <Button type="submit" variant="secondary" size="lg">
                <Wand2 className="h-4 w-4" />
                {locale === "ar" ? "حمّل مشاريع تجريبية" : "Load sample projects"}
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
