"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BriefAudience, DbProject } from "@/types/database";
import {
  type PipelineBrief,
  type PipelineDocument,
  type PipelineSnapshot,
  type PipelineState,
  classifyByFilename,
  loadPipeline,
  readFilePreview,
  savePipeline,
} from "@/lib/store/pipeline-store";
import { newId } from "@/lib/utils/ids";
import { yieldToBrowser, hasEnoughRamForLargeModel } from "@/lib/utils/yield";
import { extractText } from "@/lib/parsers/document-text";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  type LlmProgress,
  ensureEngine,
  getLoadedModelId,
  unloadEngine,
} from "@/lib/llm/web-llm";
import { extractFactsWithLlm } from "@/lib/extraction/llm-extractor";
import { runMockExtraction } from "@/lib/extraction/mock-extractor";
import { composeBrief } from "@/lib/brief/composer";
import { StageTabs, type StageId } from "./_pipeline/stage-tabs";
import { UploadCard } from "./_pipeline/upload-card";
import { AiEngineCard } from "./_pipeline/ai-engine-card";
import { ExtractCard } from "./_pipeline/extract-card";
import { BriefCard } from "./_pipeline/brief-card";
import { PublishCard, type QualitySummary } from "./_pipeline/publish-card";
import { AgentPanel } from "@/components/agents/agent-panel";
import { orchestrateAgents } from "@/lib/agents/orchestrator";
import { mintEvidenceForFacts } from "@/lib/evidence/evidence";
import { anchorFacts } from "@/lib/extraction/anchor";
import { EvidenceSplitView } from "@/components/evidence/evidence-split-view";

interface Props {
  project: DbProject;
}

const MAX_FILES = 25;
const INITIAL_STATE: PipelineState = {
  documents: [],
  facts: [],
  evidence: [],
  briefs: [],
  snapshots: [],
};

export function ProjectPipeline({ project }: Props) {
  const { dir } = useLocale();

  // Persisted state
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  // Per-document parsed text — not persisted (localStorage quota).
  const [docTexts, setDocTexts] = useState<Record<string, string>>({});
  const [docPages, setDocPages] = useState<Record<string, number>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setState(loadPipeline(project.id));
    setHydrated(true);
  }, [project.id]);

  useEffect(() => {
    if (!hydrated) return;
    savePipeline(project.id, state);
  }, [hydrated, project.id, state]);

  // Stage tab
  const [active, setActive] = useState<StageId>("upload");

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setParsing(true);
    const queue = Array.from(files).slice(0, MAX_FILES - state.documents.length);
    const newDocs: PipelineDocument[] = [];
    const newTexts: Record<string, string> = {};
    const newPages: Record<string, number> = {};
    const newErrors: Record<string, string> = {};
    for (const file of queue) {
      const cls = classifyByFilename(file.name);
      const id = newId("doc");
      let preview: string | null = null;
      let parsed: {
        text: string;
        pages: number;
        truncated: boolean;
        error?: string;
      } = { text: "", pages: 0, truncated: false };
      try {
        preview = await readFilePreview(file);
        parsed = await extractText(file);
      } catch (err) {
        // Belt-and-braces: extractText already catches internally, but
        // a bad File object (unreadable stream) can still throw here.
        parsed = {
          text: "",
          pages: 0,
          truncated: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      if (parsed.text) {
        newTexts[id] = parsed.text;
        newPages[id] = parsed.pages;
      }
      if (parsed.error) {
        newErrors[id] = parsed.error;
      }
      newDocs.push({
        id,
        project_id: project.id,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        document_type: cls.type,
        classification_confidence: cls.confidence,
        preview_text: preview ?? parsed.text.slice(0, 500) ?? null,
        created_at: new Date().toISOString(),
      });
      // Yield to the browser between files so long batches don't lock
      // the main thread on constrained mobiles (System UI freeze).
      await yieldToBrowser();
    }
    setState((s) => ({ ...s, documents: [...s.documents, ...newDocs] }));
    setDocTexts((m) => ({ ...m, ...newTexts }));
    setDocPages((m) => ({ ...m, ...newPages }));
    setDocErrors((m) => ({ ...m, ...newErrors }));
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeDocument(id: string) {
    setState((s) => ({
      ...s,
      documents: s.documents.filter((d) => d.id !== id),
      facts: s.facts.filter((f) => f.document_id !== id),
      evidence: s.evidence.filter((e) => e.source_document_id !== id),
    }));
    setDocTexts((m) => {
      const { [id]: _omit, ...rest } = m;
      return rest;
    });
    setDocPages((m) => {
      const { [id]: _omit, ...rest } = m;
      return rest;
    });
    setDocErrors((m) => {
      const { [id]: _omit, ...rest } = m;
      return rest;
    });
  }

  // AI engine state
  const [llmProgress, setLlmProgress] = useState<LlmProgress>({
    status: "idle",
    progress: 0,
    text: "",
    model_id: getLoadedModelId(),
    error: null,
  });
  const [selectedModelId, setSelectedModelId] = useState<string>(
    getLoadedModelId() ?? DEFAULT_MODEL_ID,
  );

  async function handleLoadModel() {
    // Gate large model downloads by device RAM. A 700 MB+ model on a
    // 3 GB Android freezes the WebView (System UI stops responding).
    const chosen = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);
    const needsBigRam = (chosen?.size_mb ?? 0) > 500;
    if (needsBigRam && !hasEnoughRamForLargeModel(4)) {
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm(
              locale === "ar"
                ? "هذا النموذج كبير (أكبر من ٥٠٠ ميجابايت) وقد يُثقل الأجهزة المحمولة ويسبّب تجمّد النظام. هل تريد المتابعة؟"
                : "This model is large (>500 MB) and may overwhelm mobile devices, causing the system UI to freeze. Continue anyway?",
            )
          : true;
      if (!confirmed) return;
    }
    try {
      await ensureEngine(selectedModelId, (s) => {
        setLlmProgress(adaptEngineStatus(s, selectedModelId));
      });
    } catch {
      // status already reflected via callback
    }
  }
  async function handleUnload() {
    await unloadEngine();
    setLlmProgress({
      status: "idle",
      progress: 0,
      text: "",
      model_id: null,
      error: null,
    });
  }

  // Extraction
  const [extracting, setExtracting] = useState(false);
  const [extractionMeta, setExtractionMeta] = useState<{
    used_llm: boolean;
    model_id: string | null;
    fallback_reason: string | null;
  } | null>(null);

  async function handleExtract() {
    if (state.documents.length === 0) return;
    setExtracting(true);
    try {
      if (getLoadedModelId()) {
        const result = await extractFactsWithLlm({
          projectId: project.id,
          subject: project.subject,
          authorityEn: project.client_authority_en,
          counterpartyEn: project.counterparty_en,
          documents: state.documents,
          documentTexts: docTexts,
        });
        const anchored = anchorFacts(result.facts, docTexts);
        const minted = await mintEvidenceForFacts({
          facts: anchored.facts,
          documents: state.documents,
          documentTexts: docTexts,
        });
        setState((s) => ({ ...s, facts: minted.facts, evidence: minted.evidence }));
        setExtractionMeta({
          used_llm: result.used_llm,
          model_id: result.model_id,
          fallback_reason: result.fallback_reason,
        });
      } else {
        const facts = runMockExtraction({
          projectId: project.id,
          subject: project.subject,
          documents: state.documents,
          authorityEn: project.client_authority_en,
          counterpartyEn: project.counterparty_en,
        });
        const anchored = anchorFacts(facts, docTexts);
        const minted = await mintEvidenceForFacts({
          facts: anchored.facts,
          documents: state.documents,
          documentTexts: docTexts,
        });
        setState((s) => ({ ...s, facts: minted.facts, evidence: minted.evidence }));
        setExtractionMeta({
          used_llm: false,
          model_id: null,
          fallback_reason: null,
        });
      }
    } finally {
      setExtracting(false);
    }
  }

  function toggleVerified(factId: string) {
    setState((s) => ({
      ...s,
      facts: s.facts.map((f) =>
        f.id === factId ? { ...f, user_verified: !f.user_verified } : f,
      ),
    }));
  }

  // Brief
  const { locale } = useLocale();
  const [audience, setAudience] = useState<BriefAudience>("director");
  const [briefLocale, setBriefLocale] = useState<"en" | "ar">(locale);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  function handleGenerateBrief() {
    if (state.facts.length === 0) return;
    setGeneratingBrief(true);
    try {
      const composed = composeBrief({
        projectName: project.name,
        subject: project.subject,
        audience,
        authorityEn: project.client_authority_en,
        authorityAr: project.client_authority_ar,
        counterpartyEn: project.counterparty_en,
        counterpartyAr: project.counterparty_ar,
        facts: state.facts,
        locale: briefLocale,
      });
      const brief: PipelineBrief = {
        id: newId("brief"),
        project_id: project.id,
        text_en: composed.text_en,
        text_ar: composed.text_ar,
        audience,
        created_at: new Date().toISOString(),
      };
      setState((s) => ({ ...s, briefs: [brief, ...s.briefs] }));
    } finally {
      setGeneratingBrief(false);
    }
  }

  const latestBrief = state.briefs[0] ?? null;

  // Multi-agent orchestration — deterministic, recomputes whenever
  // facts or the latest brief change.
  const agentReport = useMemo(
    () =>
      orchestrateAgents({
        subject: project.subject,
        facts: state.facts,
        brief_text_en: latestBrief?.text_en,
        brief_text_ar: latestBrief?.text_ar,
      }),
    [project.subject, state.facts, latestBrief],
  );

  // Quality gate
  const quality: QualitySummary = useMemo(() => {
    const has_documents = state.documents.length > 0;
    const has_facts = state.facts.length > 0;
    const has_brief = state.briefs.length > 0;
    const has_high = state.facts.some((f) => f.confidence === "HIGH");
    const has_risk = state.facts.some((f) => f.fact_type === "open_risk");
    const score = [has_documents, has_facts, has_brief, has_high, has_risk].filter(
      Boolean,
    ).length;
    return { has_documents, has_facts, has_brief, has_high, has_risk, score };
  }, [state]);

  function handlePublish() {
    if (!latestBrief) return;
    const snapshot: PipelineSnapshot = {
      id: newId("snap"),
      project_id: project.id,
      brief_id: latestBrief.id,
      share_token: newId("share").slice(0, 24),
      published: true,
      override_note: null,
      created_at: new Date().toISOString(),
      quality: {
        has_documents: quality.has_documents,
        has_facts: quality.has_facts,
        has_brief: quality.has_brief,
        score: quality.score,
      },
    };
    setState((s) => ({ ...s, snapshots: [snapshot, ...s.snapshots] }));
  }

  const latestSnapshot = state.snapshots[0] ?? null;

  const { t } = useLocale();
  const stages = [
    {
      id: "upload" as const,
      label: t.pipeline.stages.upload,
      done: state.documents.length > 0,
      disabled: false,
    },
    {
      id: "extract" as const,
      label: t.pipeline.stages.extract,
      done: state.facts.length > 0,
      disabled: state.documents.length === 0,
    },
    {
      id: "brief" as const,
      label: t.pipeline.stages.brief,
      done: state.briefs.length > 0,
      disabled: state.facts.length === 0,
    },
    {
      id: "publish" as const,
      label: t.pipeline.stages.publish,
      done: state.snapshots.length > 0,
      disabled: state.briefs.length === 0,
    },
  ];

  if (!hydrated) {
    return (
      <div className="space-y-5" aria-busy>
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={dir}>
      <StageTabs stages={stages} active={active} onSelect={setActive} />

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          {active === "upload" && (
            <>
              <UploadCard
                documents={state.documents}
                parsing={parsing}
                pages={docPages}
                errors={docErrors}
                onPick={() => fileInputRef.current?.click()}
                onFiles={handleFiles}
                onRemove={removeDocument}
                fileInputRef={fileInputRef}
              />
              <AiEngineCard
                progress={llmProgress}
                selectedModelId={selectedModelId}
                onSelectModel={setSelectedModelId}
                onLoad={handleLoadModel}
                onUnload={handleUnload}
              />
            </>
          )}

          {active === "extract" && (
            <>
              {state.facts.length > 0 && (
                <EvidenceSplitView
                  facts={state.facts}
                  evidence={state.evidence}
                  documents={state.documents}
                  documentTexts={docTexts}
                />
              )}
              <ExtractCard
                facts={state.facts}
                documents={state.documents}
                meta={extractionMeta}
                running={extracting}
                canRun={state.documents.length > 0}
                onRun={handleExtract}
                onToggleVerified={toggleVerified}
              />
              {state.facts.length > 0 && (
                <AgentPanel
                  reports={agentReport.reports}
                  documents={state.documents}
                  pageLabel={(n: number) =>
                    t.pipeline.extract.page.replace("{n}", String(n))
                  }
                />
              )}
            </>
          )}

          {active === "brief" && (
            <BriefCard
              brief={latestBrief}
              audience={audience}
              onSelectAudience={setAudience}
              briefLocale={briefLocale}
              onSelectLocale={setBriefLocale}
              canGenerate={state.facts.length > 0}
              generating={generatingBrief}
              onGenerate={handleGenerateBrief}
            />
          )}

          {active === "publish" && (
            <PublishCard
              snapshot={latestSnapshot}
              brief={latestBrief}
              projectId={project.id}
              quality={quality}
              onPublish={handlePublish}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function adaptEngineStatus(
  s: {
    phase: "idle" | "checking" | "downloading" | "ready" | "error";
    progress?: number;
    text?: string;
    modelId?: string;
    message?: string;
  },
  modelId: string,
): LlmProgress {
  switch (s.phase) {
    case "idle":
      return { status: "idle", progress: 0, text: "", model_id: null, error: null };
    case "checking":
      return {
        status: "checking_support",
        progress: 0,
        text: "Checking WebGPU…",
        model_id: modelId,
        error: null,
      };
    case "downloading":
      return {
        status: "downloading",
        progress: s.progress ?? 0,
        text: s.text ?? "",
        model_id: modelId,
        error: null,
      };
    case "ready":
      return {
        status: "ready",
        progress: 1,
        text: "Ready",
        model_id: s.modelId ?? modelId,
        error: null,
      };
    case "error":
      return {
        status: s.message?.toLowerCase().includes("webgpu") ? "unsupported" : "error",
        progress: 0,
        text: s.message ?? "Error",
        model_id: modelId,
        error: s.message ?? "Error",
      };
  }
}
