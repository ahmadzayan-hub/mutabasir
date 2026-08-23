// Mock extraction engine. Generates realistic, structured facts for the demo
// based on the project's subject (contract management vs. tender evaluation)
// and the documents the user uploaded. Replaced by a real LLM-backed
// extractor in Phase 3.

import type { DbExtractedFact, Subject, Confidence } from "@/types/database";
import type { PipelineDocument } from "@/lib/store/pipeline-store";
import { newId } from "@/lib/store/pipeline-store";

export interface ExtractionInput {
  projectId: string;
  subject: Subject;
  documents: PipelineDocument[];
  authorityEn: string | null;
  counterpartyEn: string | null;
}

function pickDoc(
  documents: PipelineDocument[],
  matchers: RegExp[],
): PipelineDocument | null {
  for (const re of matchers) {
    const hit = documents.find(
      (d) => re.test(d.filename) || re.test(d.document_type),
    );
    if (hit) return hit;
  }
  return documents[0] ?? null;
}

function fact(
  projectId: string,
  documentId: string,
  fact_type: string,
  payload: Record<string, unknown>,
  citation_quote: string,
  citation_page: number,
  confidence: Confidence,
): DbExtractedFact {
  return {
    id: newId("fact"),
    project_id: projectId,
    document_id: documentId,
    fact_type,
    payload_json: payload,
    citation_page,
    citation_quote,
    confidence,
    user_verified: false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Read a contract value out of the document instead of asserting one.
 *
 * The baseline used to emit a hard-coded "AED 12,450,000" whatever the
 * uploaded file said. In a product whose entire promise is "show me the
 * evidence", a figure nobody read is the one thing that must never ship --
 * and once citations were anchored to real text, the invented number began
 * visibly contradicting its own quote. So: find the amount in the text, or
 * emit no contract-value fact at all. A missing fact is honest; a
 * fabricated one is not.
 */
function readContractValue(
  text: string | null,
): { amount: number; currency: string; sentence: string } | null {
  if (!text) return null;
  const CURRENCY = /\b(AED|USD|EUR|GBP|SAR|QAR|KWD|OMR|BHD)\b/i;
  for (const raw of text.split(/(?<=[.\u061F?!])\s+|\r?\n/)) {
    const sentence = raw.trim();
    if (!sentence || !CURRENCY.test(sentence)) continue;
    const cur = sentence.match(CURRENCY);
    const num = sentence.match(/\d[\d,._\s]*\d/);
    if (!cur || !num) continue;
    const amount = Number(num[0].replace(/[^\d]/g, ""));
    // A contract value, not a clause number or a page count.
    if (!Number.isFinite(amount) || amount < 1000) continue;
    return { amount, currency: cur[1]!.toUpperCase(), sentence };
  }
  return null;
}

// ---------------------------------------------------------------------------

function contractFacts(input: ExtractionInput): DbExtractedFact[] {
  const { projectId, documents, authorityEn, counterpartyEn } = input;
  if (documents.length === 0) return [];

  const contract = pickDoc(documents, [/contract|agreement/i]);
  const progress = pickDoc(documents, [/progress|monthly|report/i]);
  const minutes = pickDoc(documents, [/minutes|meeting/i]);
  const primary = contract ?? documents[0]!;

  const counter = counterpartyEn ?? "Counterparty";
  const auth = authorityEn ?? "Client Authority";
  const value = readContractValue(primary.preview_text);

  return [
    fact(
      projectId,
      primary.id,
      "contracting_parties",
      { authority: auth, counterparty: counter },
      `This Agreement is entered into between ${auth} ("Client") and ${counter} ("Contractor").`,
      1,
      "HIGH",
    ),
    ...(value
      ? [
          fact(
            projectId,
            primary.id,
            "contract_value",
            { amount: value.amount, currency: value.currency },
            value.sentence,
            3,
            "HIGH",
          ),
        ]
      : []),
    fact(
      projectId,
      primary.id,
      "term",
      { months: 18, start: "2026-01-15", end: "2027-07-14" },
      "The Term commences on 15 January 2026 and continues for eighteen (18) calendar months.",
      2,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "payment_terms",
      { schedule: "monthly", net_days: 30, retention_pct: 5 },
      "Invoices shall be raised monthly, payable within 30 days, subject to 5% retention released on final acceptance.",
      4,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "governing_law",
      { jurisdiction: "United Arab Emirates", venue: "Dubai" },
      "This Agreement shall be governed by the laws of the United Arab Emirates and Dubai courts shall have exclusive jurisdiction.",
      18,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "termination_for_convenience",
      { notice_days: 60, payable: "work performed + demobilisation" },
      "Either party may terminate this Agreement for convenience on 60 days' written notice.",
      14,
      "MEDIUM",
    ),
    fact(
      projectId,
      primary.id,
      "liquidated_damages",
      { rate_pct_per_week: 0.5, cap_pct: 10 },
      "Liquidated damages of 0.5% of contract value shall apply for each completed week of delay, capped at 10%.",
      11,
      "MEDIUM",
    ),
    fact(
      projectId,
      progress?.id ?? primary.id,
      "milestone_status",
      {
        completed: ["Mobilisation", "Inception report"],
        in_progress: ["Phase 1 design"],
        overdue: ["Stakeholder workshop"],
        on_track_pct: 67,
      },
      "As of reporting period, 67% of milestones are on or ahead of schedule; the Stakeholder Workshop is 11 days overdue.",
      2,
      progress ? "HIGH" : "LOW",
    ),
    fact(
      projectId,
      minutes?.id ?? primary.id,
      "open_risk",
      {
        title: "Scope creep on Phase 2 deliverables",
        severity: "amber",
        owner: counter,
        due: "2026-06-30",
      },
      "Action item #14: Contractor to circulate a written scope confirmation by 30 June 2026 to avoid scope creep.",
      6,
      minutes ? "HIGH" : "LOW",
    ),
  ];
}

function tenderFacts(input: ExtractionInput): DbExtractedFact[] {
  const { projectId, documents, authorityEn } = input;
  if (documents.length === 0) return [];

  const criteria = pickDoc(documents, [/criteria|evaluation|rfp/i]);
  const bafo = pickDoc(documents, [/bafo|best.?and.?final/i]);
  const submission = pickDoc(documents, [/tender|bid|proposal|submission/i]);
  const primary = criteria ?? documents[0]!;
  const auth = authorityEn ?? "Issuing Authority";

  return [
    fact(
      projectId,
      primary.id,
      "issuing_authority",
      { name: auth },
      `Tender issued by ${auth} on behalf of the Government of Dubai.`,
      1,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "evaluation_weights",
      {
        technical_pct: 70,
        commercial_pct: 30,
        passing_technical_score: 75,
      },
      "Technical evaluation carries 70% weight; commercial 30%. Minimum technical pass mark: 75/100.",
      4,
      "HIGH",
    ),
    fact(
      projectId,
      submission?.id ?? primary.id,
      "bidder_scores",
      {
        bidders: [
          { name: "Bidder A", technical: 88, commercial: 27, total: 88 * 0.7 + 27 },
          { name: "Bidder B", technical: 82, commercial: 30, total: 82 * 0.7 + 30 },
          { name: "Bidder C", technical: 74, commercial: 29, total: 74 * 0.7 + 29 },
        ],
      },
      "Technical scores: A=88, B=82, C=74 (below pass mark). Commercial: A=AED 9.4M, B=AED 8.8M, C=AED 8.1M.",
      9,
      submission ? "HIGH" : "MEDIUM",
    ),
    fact(
      projectId,
      bafo?.id ?? primary.id,
      "bafo_outcome",
      {
        round: "BAFO 1",
        leading_bidder: "Bidder A",
        revised_offer: { currency: "AED", amount: 9_050_000 },
        delta_vs_initial_pct: -3.7,
      },
      "Bidder A revised commercial offer to AED 9,050,000 (a 3.7% reduction from initial submission).",
      3,
      bafo ? "HIGH" : "LOW",
    ),
    fact(
      projectId,
      primary.id,
      "mandatory_eligibility",
      {
        license: "Valid trade licence in Dubai or equivalent free-zone",
        experience_years: 7,
        similar_projects_min: 3,
      },
      "Mandatory: 7+ years' relevant experience and at least 3 similar projects delivered in the past 5 years.",
      6,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "submission_deadline",
      { date: "2026-04-15", time: "15:00 GST" },
      "Sealed submissions due no later than 15:00 GST on 15 April 2026.",
      2,
      "HIGH",
    ),
    fact(
      projectId,
      submission?.id ?? primary.id,
      "recommended_award",
      {
        bidder: "Bidder A",
        rationale:
          "Highest combined score, strong technical compliance, second-lowest revised commercial after BAFO.",
        weighted_score: 88 * 0.7 + 27,
      },
      "Award recommendation: Bidder A on combined technical and commercial score of 88.6.",
      14,
      "MEDIUM",
    ),
    fact(
      projectId,
      primary.id,
      "open_risk",
      {
        title: "Bidder A insurance certificate expires before contract signature",
        severity: "amber",
        action: "Request renewed certificate within 7 working days.",
      },
      "Risk flag: Bidder A's PI insurance expires 30 April 2026 — request renewal before award.",
      11,
      "MEDIUM",
    ),
  ];
}

function opsFacts(input: ExtractionInput): DbExtractedFact[] {
  const { projectId, documents, authorityEn, counterpartyEn } = input;
  if (documents.length === 0) return [];

  const log = pickDoc(documents, [/maintenance|log|work.?order/i]);
  const sla = pickDoc(documents, [/sla|service.?level|report/i]);
  const primary = log ?? documents[0]!;
  const auth = authorityEn ?? "Asset Owner";
  const counter = counterpartyEn ?? "O&M Contractor";

  return [
    fact(
      projectId,
      primary.id,
      "service_contract",
      { authority: auth, contractor: counter, scope: "Facilities operations & preventive maintenance" },
      `Service contract between ${auth} and ${counter} for full-scope facilities operations and preventive maintenance.`,
      1,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "asset_inventory",
      { sites: 12, critical_assets: 184, planned_pm_per_month: 240 },
      "Active service covers 12 sites, 184 critical assets and approximately 240 planned PM activities per month.",
      2,
      "HIGH",
    ),
    fact(
      projectId,
      sla?.id ?? primary.id,
      "sla_performance",
      {
        availability_pct: 99.2,
        mttr_hours: 3.8,
        first_time_fix_pct: 84,
        sla_breaches_quarter: 2,
      },
      "Quarterly performance: 99.2% availability, MTTR 3.8h, first-time-fix 84%, 2 SLA breaches (both <2h).",
      4,
      sla ? "HIGH" : "MEDIUM",
    ),
    fact(
      projectId,
      primary.id,
      "work_order_backlog",
      { open: 47, overdue: 6, oldest_days: 14, by_priority: { p1: 0, p2: 3, p3: 12, p4: 32 } },
      "Open WO backlog: 47 tickets, 6 overdue. Oldest open ticket: 14 days. No P1 backlog.",
      6,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "spare_parts_coverage",
      { critical_coverage_pct: 92, stockout_risk_items: 3 },
      "Critical spares coverage at 92%; 3 SKUs flagged for stockout risk within 30 days.",
      8,
      "MEDIUM",
    ),
    fact(
      projectId,
      sla?.id ?? primary.id,
      "energy_efficiency",
      { kwh_per_m2_yoy_change_pct: -4.6, savings_aed_quarter: 184_000 },
      "Year-on-year kWh/m² reduced by 4.6%; quarterly energy cost savings approximately AED 184,000.",
      10,
      sla ? "HIGH" : "LOW",
    ),
    fact(
      projectId,
      primary.id,
      "open_risk",
      {
        title: "Chiller plant #3 approaching end of useful life",
        severity: "amber",
        recommendation: "Capital replacement plan within 9 months",
      },
      "Risk: chiller plant #3 (commissioned 2008) approaching end of useful life. Recommend capital replacement plan within 9 months.",
      12,
      "MEDIUM",
    ),
  ];
}

function constructionFacts(input: ExtractionInput): DbExtractedFact[] {
  const { projectId, documents, authorityEn, counterpartyEn } = input;
  if (documents.length === 0) return [];

  const progress = pickDoc(documents, [/site|progress|monthly/i]);
  const safety = pickDoc(documents, [/safety|hse/i]);
  const primary = progress ?? documents[0]!;
  const owner = authorityEn ?? "Project Owner";
  const contractor = counterpartyEn ?? "Main Contractor";

  return [
    fact(
      projectId,
      primary.id,
      "project_scope",
      {
        owner,
        contractor,
        type: "Mixed-use development · 4 towers · 280,000 m²",
        contract_form: "FIDIC Yellow Book 2017",
      },
      `Mixed-use development of 4 towers (280,000 m² GFA) for ${owner}, delivered by ${contractor} under FIDIC Yellow Book 2017.`,
      1,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "contract_value",
      { amount: 1_240_000_000, currency: "AED", change_orders_pct: 3.2 },
      "Awarded value AED 1.24bn; cumulative variation orders +3.2% of contract sum.",
      2,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "schedule_status",
      {
        original_completion: "2027-09-30",
        forecast_completion: "2027-11-15",
        delay_days: 46,
        on_critical_path: ["MEP rough-in tower B", "Facade install tower A"],
      },
      "Original completion 30 Sep 2027; forecast 15 Nov 2027 (46 days adverse). MEP rough-in (Tower B) and facade install (Tower A) on critical path.",
      3,
      "HIGH",
    ),
    fact(
      projectId,
      primary.id,
      "physical_progress",
      {
        planned_pct: 58,
        actual_pct: 54,
        spi: 0.93,
        cpi: 0.97,
      },
      "Planned progress 58%; actual 54%. SPI 0.93 (behind), CPI 0.97 (slightly over budget).",
      4,
      "HIGH",
    ),
    fact(
      projectId,
      safety?.id ?? primary.id,
      "hse_performance",
      {
        man_hours_qtr: 1_640_000,
        ltifr: 0.18,
        recordable_incidents: 3,
        near_misses: 27,
      },
      "1.64m man-hours this quarter; LTIFR 0.18 (industry benchmark 0.4); 3 recordable incidents, 27 near-misses logged & closed.",
      6,
      safety ? "HIGH" : "MEDIUM",
    ),
    fact(
      projectId,
      primary.id,
      "quality_ncrs",
      { open_ncrs: 14, closed_this_period: 22, repeat_offenders: 2 },
      "14 open Non-Conformance Reports; 22 closed this period; 2 repeat-issue subcontractors identified.",
      8,
      "MEDIUM",
    ),
    fact(
      projectId,
      primary.id,
      "open_risk",
      {
        title: "Facade material lead time slipped from 18 to 26 weeks",
        severity: "red",
        mitigation:
          "Dual-source approval pack submitted; decision required within 14 days to protect critical path.",
      },
      "Critical risk: facade material lead time extended from 18 to 26 weeks. Dual-source approval submitted; owner decision required within 14 days.",
      10,
      "HIGH",
    ),
  ];
}

export function runMockExtraction(input: ExtractionInput): DbExtractedFact[] {
  switch (input.subject) {
    case "contract_management":
      return contractFacts(input);
    case "tender_evaluation":
      return tenderFacts(input);
    case "operations_maintenance":
      return opsFacts(input);
    case "construction":
      return constructionFacts(input);
  }
}

export function describeFactType(
  type: string,
  locale: "en" | "ar",
): { label: string; group: "key_terms" | "performance" | "risk" } {
  const map: Record<
    string,
    { en: string; ar: string; group: "key_terms" | "performance" | "risk" }
  > = {
    contracting_parties: { en: "Parties", ar: "الأطراف", group: "key_terms" },
    contract_value: {
      en: "Contract value",
      ar: "قيمة العقد",
      group: "key_terms",
    },
    term: { en: "Term", ar: "المدة", group: "key_terms" },
    payment_terms: {
      en: "Payment terms",
      ar: "شروط الدفع",
      group: "key_terms",
    },
    governing_law: {
      en: "Governing law",
      ar: "القانون الحاكم",
      group: "key_terms",
    },
    termination_for_convenience: {
      en: "Termination for convenience",
      ar: "الإنهاء للمصلحة",
      group: "key_terms",
    },
    liquidated_damages: {
      en: "Liquidated damages",
      ar: "غرامات التأخير",
      group: "risk",
    },
    milestone_status: {
      en: "Milestone status",
      ar: "حالة المراحل",
      group: "performance",
    },
    open_risk: { en: "Open risk", ar: "مخاطر مفتوحة", group: "risk" },
    issuing_authority: {
      en: "Issuing authority",
      ar: "الجهة المُصدِرة",
      group: "key_terms",
    },
    evaluation_weights: {
      en: "Evaluation weights",
      ar: "أوزان التقييم",
      group: "key_terms",
    },
    bidder_scores: {
      en: "Bidder scores",
      ar: "درجات المتقدّمين",
      group: "performance",
    },
    bafo_outcome: { en: "BAFO outcome", ar: "نتيجة BAFO", group: "performance" },
    mandatory_eligibility: {
      en: "Mandatory eligibility",
      ar: "الأهلية الإلزامية",
      group: "key_terms",
    },
    submission_deadline: {
      en: "Submission deadline",
      ar: "موعد التقديم",
      group: "key_terms",
    },
    recommended_award: {
      en: "Recommended award",
      ar: "التوصية بالترسية",
      group: "performance",
    },
    service_contract: {
      en: "Service contract",
      ar: "عقد الخدمات",
      group: "key_terms",
    },
    asset_inventory: {
      en: "Asset inventory",
      ar: "جرد الأصول",
      group: "key_terms",
    },
    sla_performance: {
      en: "SLA performance",
      ar: "أداء اتفاقية الخدمة",
      group: "performance",
    },
    work_order_backlog: {
      en: "Work order backlog",
      ar: "تراكم أوامر العمل",
      group: "performance",
    },
    spare_parts_coverage: {
      en: "Spare parts coverage",
      ar: "تغطية قطع الغيار",
      group: "performance",
    },
    energy_efficiency: {
      en: "Energy efficiency",
      ar: "كفاءة الطاقة",
      group: "performance",
    },
    project_scope: {
      en: "Project scope",
      ar: "نطاق المشروع",
      group: "key_terms",
    },
    schedule_status: {
      en: "Schedule status",
      ar: "حالة الجدول",
      group: "performance",
    },
    physical_progress: {
      en: "Physical progress",
      ar: "التقدّم العمراني",
      group: "performance",
    },
    hse_performance: {
      en: "HSE performance",
      ar: "أداء السلامة والصحة",
      group: "performance",
    },
    quality_ncrs: {
      en: "Quality / NCRs",
      ar: "الجودة وعدم المطابقة",
      group: "risk",
    },
  };
  const entry = map[type];
  if (!entry) return { label: type, group: "key_terms" };
  return { label: locale === "ar" ? entry.ar : entry.en, group: entry.group };
}

export function formatFactPayload(
  type: string,
  payload: Record<string, unknown>,
  locale: "en" | "ar",
): string {
  const isAr = locale === "ar";
  const fmt = (n: number) => new Intl.NumberFormat(isAr ? "ar-AE" : "en-AE").format(n);
  switch (type) {
    case "contracting_parties":
      return isAr
        ? `الجهة: ${payload.authority} · الطرف المقابل: ${payload.counterparty}`
        : `${payload.authority} ↔ ${payload.counterparty}`;
    case "contract_value":
      return `${payload.currency} ${fmt(Number(payload.amount))}`;
    case "term": {
      return isAr
        ? `${fmt(Number(payload.months))} شهراً (${payload.start} → ${payload.end})`
        : `${payload.months} months (${payload.start} → ${payload.end})`;
    }
    case "payment_terms":
      return isAr
        ? `${payload.schedule === "monthly" ? "شهرياً" : payload.schedule} · صافي ${fmt(Number(payload.net_days))} يوماً · احتجاز ${payload.retention_pct}%`
        : `${payload.schedule} · net ${payload.net_days} days · ${payload.retention_pct}% retention`;
    case "governing_law":
      return `${payload.jurisdiction} · ${payload.venue}`;
    case "termination_for_convenience":
      return isAr
        ? `إشعار ${fmt(Number(payload.notice_days))} يوماً · يُدفع: ${payload.payable}`
        : `${payload.notice_days}-day notice · payable: ${payload.payable}`;
    case "liquidated_damages":
      return isAr
        ? `${payload.rate_pct_per_week}% أسبوعياً · بحد أقصى ${payload.cap_pct}%`
        : `${payload.rate_pct_per_week}% / week · cap ${payload.cap_pct}%`;
    case "milestone_status": {
      const m = payload as {
        completed: string[];
        in_progress: string[];
        overdue: string[];
        on_track_pct: number;
      };
      return isAr
        ? `${m.on_track_pct}% في المسار · مكتمل: ${m.completed.length} · جارٍ: ${m.in_progress.length} · متأخر: ${m.overdue.length}`
        : `${m.on_track_pct}% on track · ${m.completed.length} done · ${m.in_progress.length} in flight · ${m.overdue.length} overdue`;
    }
    case "open_risk":
      return `${payload.title}${payload.severity ? ` · ${String(payload.severity).toUpperCase()}` : ""}`;
    case "issuing_authority":
      return String(payload.name);
    case "evaluation_weights":
      return isAr
        ? `تقني ${payload.technical_pct}% · تجاري ${payload.commercial_pct}% · حد النجاح ${payload.passing_technical_score}`
        : `Technical ${payload.technical_pct}% · Commercial ${payload.commercial_pct}% · pass ≥ ${payload.passing_technical_score}`;
    case "bidder_scores": {
      const arr = (payload as { bidders: Array<{ name: string; total: number }> })
        .bidders;
      return arr
        .map((b) => `${b.name}: ${b.total.toFixed(1)}`)
        .join(" · ");
    }
    case "bafo_outcome": {
      const o = payload as {
        leading_bidder: string;
        revised_offer: { currency: string; amount: number };
        delta_vs_initial_pct: number;
      };
      return isAr
        ? `${o.leading_bidder} · ${o.revised_offer.currency} ${fmt(o.revised_offer.amount)} (${o.delta_vs_initial_pct}%)`
        : `${o.leading_bidder} · ${o.revised_offer.currency} ${fmt(o.revised_offer.amount)} (${o.delta_vs_initial_pct}%)`;
    }
    case "mandatory_eligibility":
      return isAr
        ? `خبرة ${payload.experience_years}+ سنوات · ${payload.similar_projects_min} مشاريع مماثلة`
        : `${payload.experience_years}+ yrs · ${payload.similar_projects_min} similar projects`;
    case "submission_deadline":
      return `${payload.date} · ${payload.time}`;
    case "recommended_award":
      return isAr
        ? `${payload.bidder} · النتيجة المرجّحة ${Number(payload.weighted_score).toFixed(1)}`
        : `${payload.bidder} · weighted ${Number(payload.weighted_score).toFixed(1)}`;
    case "service_contract":
      return isAr
        ? `${payload.authority} ↔ ${payload.contractor} · ${payload.scope}`
        : `${payload.authority} ↔ ${payload.contractor} · ${payload.scope}`;
    case "asset_inventory":
      return isAr
        ? `${fmt(Number(payload.sites))} موقعاً · ${fmt(Number(payload.critical_assets))} أصلاً حرجاً · ${fmt(Number(payload.planned_pm_per_month))} ص.و/شهر`
        : `${payload.sites} sites · ${payload.critical_assets} critical assets · ${payload.planned_pm_per_month} PM/mo`;
    case "sla_performance":
      return isAr
        ? `توفّر ${payload.availability_pct}% · MTTR ${payload.mttr_hours}س · إصلاح من أول مرة ${payload.first_time_fix_pct}% · انتهاكات ${payload.sla_breaches_quarter}`
        : `Availability ${payload.availability_pct}% · MTTR ${payload.mttr_hours}h · FTF ${payload.first_time_fix_pct}% · breaches ${payload.sla_breaches_quarter}`;
    case "work_order_backlog":
      return isAr
        ? `${fmt(Number(payload.open))} مفتوحاً · ${fmt(Number(payload.overdue))} متأخراً · أقدم ${fmt(Number(payload.oldest_days))} يوماً`
        : `${payload.open} open · ${payload.overdue} overdue · oldest ${payload.oldest_days}d`;
    case "spare_parts_coverage":
      return isAr
        ? `تغطية ${payload.critical_coverage_pct}% · ${fmt(Number(payload.stockout_risk_items))} عناصر بخطر النفاد`
        : `${payload.critical_coverage_pct}% coverage · ${payload.stockout_risk_items} stockout-risk SKUs`;
    case "energy_efficiency":
      return isAr
        ? `${payload.kwh_per_m2_yoy_change_pct}% س.ع.س · توفير ${fmt(Number(payload.savings_aed_quarter))} د.إ/ربع`
        : `${payload.kwh_per_m2_yoy_change_pct}% YoY · AED ${fmt(Number(payload.savings_aed_quarter))} savings / qtr`;
    case "project_scope":
      return `${payload.type} · ${payload.contract_form}`;
    case "schedule_status": {
      const s = payload as {
        original_completion: string;
        forecast_completion: string;
        delay_days: number;
      };
      return isAr
        ? `الأصلي ${s.original_completion} · المتوقّع ${s.forecast_completion} · ${fmt(s.delay_days)} يوماً انحرافاً`
        : `Plan ${s.original_completion} · forecast ${s.forecast_completion} · ${s.delay_days}d variance`;
    }
    case "physical_progress":
      return isAr
        ? `مخطط ${payload.planned_pct}% · فعلي ${payload.actual_pct}% · SPI ${payload.spi} · CPI ${payload.cpi}`
        : `Plan ${payload.planned_pct}% · actual ${payload.actual_pct}% · SPI ${payload.spi} · CPI ${payload.cpi}`;
    case "hse_performance":
      return isAr
        ? `${fmt(Number(payload.man_hours_qtr))} س.ع · LTIFR ${payload.ltifr} · حوادث ${payload.recordable_incidents}`
        : `${fmt(Number(payload.man_hours_qtr))} man-hrs · LTIFR ${payload.ltifr} · ${payload.recordable_incidents} recordables`;
    case "quality_ncrs":
      return isAr
        ? `${fmt(Number(payload.open_ncrs))} مفتوحة · ${fmt(Number(payload.closed_this_period))} مُغلقة · ${payload.repeat_offenders} متكرّرين`
        : `${payload.open_ncrs} open · ${payload.closed_this_period} closed · ${payload.repeat_offenders} repeat offenders`;
    default:
      return JSON.stringify(payload);
  }
}
