// Bilingual brief composer. Turns extracted facts into a templated executive
// brief in both English and Arabic. No external AI required — fills slots
// from the fact payloads using deterministic templates tuned to the audience.

import type {
  BriefAudience,
  DbExtractedFact,
  Subject,
} from "@/types/database";

import { reviewedFacts } from "./evidence-gate";

export interface ComposeBriefInput {
  documentTexts?: Record<string, string>;
  projectName: string;
  subject: Subject;
  audience: BriefAudience;
  authorityEn: string | null;
  authorityAr: string | null;
  counterpartyEn: string | null;
  counterpartyAr: string | null;
  facts: DbExtractedFact[];
  locale: "en" | "ar";
}

interface FactsMap {
  parties?: Record<string, unknown>;
  value?: Record<string, unknown>;
  term?: Record<string, unknown>;
  payment?: Record<string, unknown>;
  law?: Record<string, unknown>;
  termination?: Record<string, unknown>;
  lds?: Record<string, unknown>;
  milestones?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  issuing?: Record<string, unknown>;
  weights?: Record<string, unknown>;
  scores?: Record<string, unknown>;
  bafo?: Record<string, unknown>;
  eligibility?: Record<string, unknown>;
  deadline?: Record<string, unknown>;
  award?: Record<string, unknown>;
}

function asFactsMap(facts: DbExtractedFact[]): FactsMap {
  const m: FactsMap = {};
  for (const f of facts) {
    switch (f.fact_type) {
      case "contracting_parties":
        m.parties = f.payload_json as Record<string, unknown>;
        break;
      case "contract_value":
        m.value = f.payload_json as Record<string, unknown>;
        break;
      case "term":
        m.term = f.payload_json as Record<string, unknown>;
        break;
      case "payment_terms":
        m.payment = f.payload_json as Record<string, unknown>;
        break;
      case "governing_law":
        m.law = f.payload_json as Record<string, unknown>;
        break;
      case "termination_for_convenience":
        m.termination = f.payload_json as Record<string, unknown>;
        break;
      case "liquidated_damages":
        m.lds = f.payload_json as Record<string, unknown>;
        break;
      case "milestone_status":
        m.milestones = f.payload_json as Record<string, unknown>;
        break;
      case "open_risk":
        m.risk = f.payload_json as Record<string, unknown>;
        break;
      case "issuing_authority":
        m.issuing = f.payload_json as Record<string, unknown>;
        break;
      case "evaluation_weights":
        m.weights = f.payload_json as Record<string, unknown>;
        break;
      case "bidder_scores":
        m.scores = f.payload_json as Record<string, unknown>;
        break;
      case "bafo_outcome":
        m.bafo = f.payload_json as Record<string, unknown>;
        break;
      case "mandatory_eligibility":
        m.eligibility = f.payload_json as Record<string, unknown>;
        break;
      case "submission_deadline":
        m.deadline = f.payload_json as Record<string, unknown>;
        break;
      case "recommended_award":
        m.award = f.payload_json as Record<string, unknown>;
        break;
    }
  }
  return m;
}

function nf(locale: "en" | "ar", n: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE").format(n);
}

const AUDIENCE_LABEL: Record<
  BriefAudience,
  { en: string; ar: string; tone: "concise" | "formal" | "detailed" }
> = {
  director: { en: "Director", ar: "المدير", tone: "concise" },
  ceo: { en: "Chief Executive", ar: "الرئيس التنفيذي", tone: "concise" },
  board: { en: "Board of Directors", ar: "مجلس الإدارة", tone: "formal" },
  internal_team: {
    en: "Internal team",
    ar: "الفريق الداخلي",
    tone: "detailed",
  },
  external_client: {
    en: "External client",
    ar: "العميل الخارجي",
    tone: "formal",
  },
};

// ---------------- Contract brief -------------------------------------------

function contractBrief(input: ComposeBriefInput): { en: string; ar: string } {
  const m = asFactsMap(input.facts);
  const auth = input.authorityEn ?? "the Client Authority";
  const authAr = input.authorityAr ?? "الجهة المتعاقدة";
  const counter = input.counterpartyEn ?? "the Contractor";
  const counterAr = input.counterpartyAr ?? "الطرف المقابل";

  const value =
    m.value && typeof m.value.amount === "number"
      ? `${m.value.currency} ${nf("en", Number(m.value.amount))}`
      : "(value not detected)";
  const valueAr =
    m.value && typeof m.value.amount === "number"
      ? `${m.value.currency} ${nf("ar", Number(m.value.amount))}`
      : "(القيمة غير محددة)";

  const termMonths = m.term ? Number(m.term.months) : null;
  const milestonePct =
    m.milestones && typeof m.milestones.on_track_pct === "number"
      ? Number(m.milestones.on_track_pct)
      : null;

  const risk =
    m.risk && typeof m.risk.title === "string"
      ? String(m.risk.title)
      : "no flagged risks at this time";
  const riskAr =
    m.risk && typeof m.risk.title === "string"
      ? String(m.risk.title)
      : "لا توجد مخاطر مرصودة حالياً";

  const en = `
## Executive summary

${auth} has engaged ${counter} under the project **${input.projectName}**. The contract has a headline value of **${value}**${termMonths ? ` over a term of **${termMonths} months**` : ""}. Documents reviewed indicate that the engagement is operating broadly within its commercial envelope.

## Performance snapshot

${milestonePct !== null ? `Approximately **${milestonePct}% of milestones are on or ahead of schedule** as of the latest reporting period.` : "A current milestone status was not detected in the supplied documents."} Key payment terms specify ${m.payment ? `**${m.payment.schedule} invoicing on net ${m.payment.net_days}** with **${m.payment.retention_pct}% retention** released on final acceptance` : "standard commercial terms"}.

## Risk & decisions required

The principal open item is: **${risk}**. ${m.lds ? `Liquidated damages of **${m.lds.rate_pct_per_week}% per week (cap ${m.lds.cap_pct}%)** are in place to enforce schedule compliance.` : ""} ${m.termination ? `The Authority retains a **${m.termination.notice_days}-day** right to terminate for convenience, payable for work performed.` : ""}

## Recommendation

Continue active management with the next progress review focused on closing the highlighted action. No contractual remedy action is recommended at this time. Escalation is recommended only if the cited risk remains unresolved beyond the next reporting cycle.
`.trim();

  const ar = `
## ملخص تنفيذي

تعاقدت ${authAr} مع ${counterAr} ضمن مشروع **${input.projectName}**. القيمة الإجمالية للعقد **${valueAr}**${termMonths ? ` على مدى **${nf("ar", termMonths)} شهراً**` : ""}. تشير الوثائق المراجَعة إلى أن المشاركة تسير ضمن إطارها التجاري بوجه عام.

## لقطة الأداء

${milestonePct !== null ? `حوالي **${nf("ar", milestonePct)}% من المراحل ضمن الجدول أو متقدّمة عليه** حتى آخر فترة تقرير.` : "لم يُكتشف ملخّص مراحل في الوثائق المقدّمة."} وتنصّ شروط الدفع الأساسية على ${m.payment ? `**إصدار فواتير ${m.payment.schedule === "monthly" ? "شهرياً" : m.payment.schedule} مع دفع خلال ${nf("ar", Number(m.payment.net_days))} يوماً** و**احتجاز ${m.payment.retention_pct}%** يُفرَج عنه عند القبول النهائي` : "الشروط التجارية المعتادة"}.

## المخاطر والقرارات المطلوبة

البند المفتوح الأهم: **${riskAr}**. ${m.lds ? `تنطبق غرامات تأخير بنسبة **${m.lds.rate_pct_per_week}% أسبوعياً (بحد أقصى ${m.lds.cap_pct}%)** لضمان الالتزام بالجدول.` : ""} ${m.termination ? `تحتفظ الجهة بحق **الإنهاء للمصلحة بإشعار ${nf("ar", Number(m.termination.notice_days))} يوماً**، مع سداد الأعمال المنجزة.` : ""}

## التوصية

الاستمرار في الإدارة الفعّالة مع تركيز مراجعة التقدّم القادمة على إغلاق البند المُبيَّن. لا يُوصى باتخاذ إجراء تعاقدي في هذه المرحلة. ويُوصى بالتصعيد فقط إذا بقيت المخاطر المذكورة دون حل بعد دورة التقرير القادمة.
`.trim();

  return { en, ar };
}

// ---------------- Tender brief ---------------------------------------------

function tenderBrief(input: ComposeBriefInput): { en: string; ar: string } {
  const m = asFactsMap(input.facts);
  const issuing = m.issuing?.name ?? input.authorityEn ?? "the Issuing Authority";
  const issuingAr =
    m.issuing?.name ?? input.authorityAr ?? "الجهة المُصدِرة";

  const weights = m.weights
    ? `**${m.weights.technical_pct}% technical / ${m.weights.commercial_pct}% commercial** (pass mark ≥ ${m.weights.passing_technical_score})`
    : "the published technical & commercial weights";
  const weightsAr = m.weights
    ? `**${m.weights.technical_pct}% تقني / ${m.weights.commercial_pct}% تجاري** (حد النجاح ≥ ${m.weights.passing_technical_score})`
    : "الأوزان التقنية والتجارية المعلنة";

  const scoreList =
    m.scores && Array.isArray((m.scores as { bidders?: unknown }).bidders)
      ? (m.scores as { bidders: Array<{ name: string; total: number }> }).bidders
      : [];
  const scoreLine = scoreList.length
    ? scoreList
        .map((b) => `${b.name}: **${b.total.toFixed(1)}**`)
        .join(" · ")
    : "(scores not detected)";

  const award =
    m.award?.bidder && m.award?.weighted_score
      ? `**${m.award.bidder}** with a weighted score of **${Number(m.award.weighted_score).toFixed(1)}**`
      : "the leading qualified bidder";
  const awardAr =
    m.award?.bidder && m.award?.weighted_score
      ? `**${m.award.bidder}** بنتيجة مرجّحة **${Number(m.award.weighted_score).toFixed(1)}**`
      : "المتقدّم الأعلى تأهيلاً";

  const risk =
    m.risk && typeof m.risk.title === "string"
      ? String(m.risk.title)
      : "no critical issues at award stage";
  const riskAr =
    m.risk && typeof m.risk.title === "string"
      ? String(m.risk.title)
      : "لا توجد قضايا حرجة في مرحلة الترسية";

  const en = `
## Executive summary

This brief consolidates the evaluation of bids received under **${input.projectName}**, issued by ${issuing}. Evaluation followed ${weights}. ${scoreList.length ? `Submissions assessed: ${scoreLine}.` : ""}

## Award recommendation

The committee recommends award to ${award}. ${m.bafo ? `Following BAFO, the leading bidder revised its commercial offer to **${m.bafo.revised_offer && (m.bafo.revised_offer as { currency: string; amount: number }).currency} ${m.bafo.revised_offer ? nf("en", Number((m.bafo.revised_offer as { amount: number }).amount)) : ""}** (${m.bafo.delta_vs_initial_pct}% vs. initial).` : ""} ${m.eligibility ? `All mandatory eligibility checks were satisfied (${m.eligibility.experience_years}+ years' experience, ≥ ${m.eligibility.similar_projects_min} similar references).` : ""}

## Risk & decisions required

Pre-award risk to monitor: **${risk}**. ${m.deadline ? `The award decision must be communicated before contract mobilisation; submissions closed on **${m.deadline.date}** at ${m.deadline.time}.` : ""}

## Recommendation

Proceed to award subject to satisfactory closure of the open risk above. Move to contract signature within 14 calendar days to preserve the bid validity period.
`.trim();

  const ar = `
## ملخص تنفيذي

يلخّص هذا التقرير تقييم العروض المقدَّمة ضمن **${input.projectName}** الصادر عن ${issuingAr}. اتّبع التقييم ${weightsAr}. ${scoreList.length ? `العروض المُقيَّمة: ${scoreLine}.` : ""}

## التوصية بالترسية

يوصي الفريق بالترسية على ${awardAr}. ${m.bafo ? `بعد جولة BAFO، عدّل المتقدّم القائد عرضه التجاري إلى **${m.bafo.revised_offer && (m.bafo.revised_offer as { currency: string; amount: number }).currency} ${m.bafo.revised_offer ? nf("ar", Number((m.bafo.revised_offer as { amount: number }).amount)) : ""}** (${m.bafo.delta_vs_initial_pct}% مقارنة بالعرض المبدئي).` : ""} ${m.eligibility ? `استوفت جميع شروط الأهلية الإلزامية (خبرة ${nf("ar", Number(m.eligibility.experience_years))}+ سنوات، ≥ ${m.eligibility.similar_projects_min} مرجعيّات مماثلة).` : ""}

## المخاطر والقرارات المطلوبة

مخاطر ما قبل الترسية الواجب رصدها: **${riskAr}**. ${m.deadline ? `يجب إبلاغ قرار الترسية قبل تعبئة العقد؛ أُغلق التقديم في **${m.deadline.date}** الساعة ${m.deadline.time}.` : ""}

## التوصية

المضيّ في الترسية رهناً بالإغلاق المُرضي للمخاطر أعلاه. الانتقال إلى توقيع العقد خلال 14 يوماً تقويمياً للحفاظ على فترة سريان العرض.
`.trim();

  return { en, ar };
}

// --- Public API ------------------------------------------------------------

function opsBrief(input: ComposeBriefInput): { en: string; ar: string } {
  const facts = input.facts.reduce<Record<string, Record<string, unknown>>>(
    (acc, f) => {
      acc[f.fact_type] = f.payload_json as Record<string, unknown>;
      return acc;
    },
    {},
  );
  const auth = input.authorityEn ?? "the Asset Owner";
  const authAr = input.authorityAr ?? "صاحب الأصول";
  const counter = input.counterpartyEn ?? "the O&M contractor";
  const counterAr = input.counterpartyAr ?? "مشغّل التشغيل والصيانة";
  const sla = facts.sla_performance;
  const wo = facts.work_order_backlog;
  const risk = facts.open_risk;
  const energy = facts.energy_efficiency;

  const en = `
## Executive summary

The operations & maintenance service for **${input.projectName}**, delivered by ${counter} to ${auth}, is performing **within contractual envelope**. ${sla ? `Quarterly availability stands at **${sla.availability_pct}%** with **MTTR of ${sla.mttr_hours} hours** and **first-time fix at ${sla.first_time_fix_pct}%**.` : ""}

## Performance snapshot

${wo ? `Open work-order backlog is **${wo.open} tickets** (**${wo.overdue} overdue**, oldest **${wo.oldest_days} days**). No P1 backlog.` : ""} ${energy ? `Energy efficiency improved **${Math.abs(Number(energy.kwh_per_m2_yoy_change_pct))}% YoY**, translating to approximately **AED ${nf("en", Number(energy.savings_aed_quarter))} of quarterly savings**.` : ""}

## Risk & decisions required

${risk ? `Principal open risk: **${risk.title}**${risk.recommendation ? `. Recommended action: ${risk.recommendation}.` : "."}` : "No critical operational risks at this time."} ${sla ? `Only ${sla.sla_breaches_quarter} SLA breaches in the quarter — all resolved within target window.` : ""}

## Recommendation

Maintain current service posture. Authorise capital planning for end-of-life asset replacement and re-confirm spare-parts reorder thresholds at the next monthly review. No contractual remedy action recommended.
`.trim();

  const ar = `
## ملخص تنفيذي

خدمة التشغيل والصيانة لمشروع **${input.projectName}**، التي يقدّمها ${counterAr} إلى ${authAr}، تعمل **ضمن الإطار التعاقدي**. ${sla ? `يبلغ التوفّر الربعي **${sla.availability_pct}%** ومتوسط زمن الإصلاح **${sla.mttr_hours} ساعة** ونسبة الإصلاح من أول مرة **${sla.first_time_fix_pct}%**.` : ""}

## لقطة الأداء

${wo ? `تراكم أوامر العمل المفتوحة **${nf("ar", Number(wo.open))} طلباً** (**${nf("ar", Number(wo.overdue))} متأخراً**، أقدمها **${nf("ar", Number(wo.oldest_days))} يوماً**). لا توجد طلبات بأولوية P1 في التراكم.` : ""} ${energy ? `تحسّنت كفاءة الطاقة بنسبة **${Math.abs(Number(energy.kwh_per_m2_yoy_change_pct))}% سنوياً**، بما يعادل **${nf("ar", Number(energy.savings_aed_quarter))} د.إ من الوفورات الربعية**.` : ""}

## المخاطر والقرارات المطلوبة

${risk ? `أبرز المخاطر المفتوحة: **${risk.title}**${risk.recommendation ? `. الإجراء المُوصى به: ${risk.recommendation}.` : "."}` : "لا توجد مخاطر تشغيلية حرجة حالياً."} ${sla ? `وقعت ${sla.sla_breaches_quarter} انتهاكات لاتفاقية الخدمة في الربع — جميعها أُغلقت ضمن النافذة الزمنية المستهدفة.` : ""}

## التوصية

الإبقاء على وضع الخدمة الحالي. اعتماد التخطيط الرأسمالي لاستبدال الأصول المنتهية العمر الافتراضي، وإعادة تأكيد عتبات إعادة طلب قطع الغيار في المراجعة الشهرية القادمة. لا يُوصى باتخاذ إجراء تعاقدي.
`.trim();

  return { en, ar };
}

function constructionBrief(input: ComposeBriefInput): {
  en: string;
  ar: string;
} {
  const facts = input.facts.reduce<Record<string, Record<string, unknown>>>(
    (acc, f) => {
      acc[f.fact_type] = f.payload_json as Record<string, unknown>;
      return acc;
    },
    {},
  );
  const scope = facts.project_scope;
  const value = facts.contract_value;
  const schedule = facts.schedule_status;
  const progress = facts.physical_progress;
  const hse = facts.hse_performance;
  const ncr = facts.quality_ncrs;
  const risk = facts.open_risk;

  const en = `
## Executive summary

The **${input.projectName}** programme — ${scope?.type ?? "the works"} — has reached **${progress?.actual_pct ?? "—"}% physical progress** against a plan of **${progress?.planned_pct ?? "—"}%**. ${value ? `Awarded value **${value.currency} ${nf("en", Number(value.amount))}** with cumulative variations at **+${value.change_orders_pct}%**.` : ""}

## Performance snapshot

${schedule ? `Forecast completion **${schedule.forecast_completion}** (original ${schedule.original_completion}; **${schedule.delay_days} days adverse variance**).` : ""} ${progress ? `**SPI ${progress.spi}** (${Number(progress.spi) < 1 ? "behind schedule" : "on/ahead of schedule"}) · **CPI ${progress.cpi}** (${Number(progress.cpi) < 1 ? "over budget" : "on/under budget"}).` : ""}

## Safety & quality

${hse ? `HSE: **${nf("en", Number(hse.man_hours_qtr))} man-hours** this quarter, **LTIFR ${hse.ltifr}** (vs. industry benchmark 0.4), **${hse.recordable_incidents} recordable incidents**.` : ""} ${ncr ? `Quality: **${ncr.open_ncrs} open NCRs**, ${ncr.closed_this_period} closed this period; ${ncr.repeat_offenders} repeat-issue subcontractors flagged for management attention.` : ""}

## Risk & decisions required

${risk ? `Critical risk: **${risk.title}** (severity **${String(risk.severity).toUpperCase()}**). ${risk.mitigation ?? ""}` : ""}

## Recommendation

Authorise the dual-source approval to protect the critical path. Maintain weekly progress reviews until SPI returns to ≥ 0.97. Defer any non-critical variation orders pending recovery of schedule float.
`.trim();

  const ar = `
## ملخص تنفيذي

وصل برنامج **${input.projectName}** — ${scope?.type ?? "الأعمال"} — إلى **${progress?.actual_pct ?? "—"}% من التقدّم العمراني** مقابل خطّة **${progress?.planned_pct ?? "—"}%**. ${value ? `القيمة المُرسّاة **${value.currency} ${nf("ar", Number(value.amount))}** مع تغييرات تراكمية **+${value.change_orders_pct}%**.` : ""}

## لقطة الأداء

${schedule ? `الاكتمال المتوقّع **${schedule.forecast_completion}** (الأصلي ${schedule.original_completion}؛ **${nf("ar", Number(schedule.delay_days))} يوماً انحرافاً سلبياً**).` : ""} ${progress ? `**SPI ${progress.spi}** (${Number(progress.spi) < 1 ? "متأخر عن الجدول" : "ضمن/متقدّم على الجدول"}) · **CPI ${progress.cpi}** (${Number(progress.cpi) < 1 ? "تجاوز الميزانية" : "ضمن/تحت الميزانية"}).` : ""}

## السلامة والجودة

${hse ? `السلامة والصحة: **${nf("ar", Number(hse.man_hours_qtr))} ساعة عمل** هذا الربع، **LTIFR ${hse.ltifr}** (مقارنة بالمعيار الصناعي 0.4)، **${hse.recordable_incidents} حوادث مسجَّلة**.` : ""} ${ncr ? `الجودة: **${nf("ar", Number(ncr.open_ncrs))} تقارير عدم مطابقة مفتوحة**، أُغلق منها ${nf("ar", Number(ncr.closed_this_period))} هذا الربع؛ ${ncr.repeat_offenders} مقاولان فرعيان متكرّرا الإشكال للنظر الإداري.` : ""}

## المخاطر والقرارات المطلوبة

${risk ? `مخاطر حرجة: **${risk.title}** (الشدّة **${String(risk.severity).toUpperCase()}**). ${risk.mitigation ?? ""}` : ""}

## التوصية

اعتماد الاعتماد المزدوج للمصدر لحماية المسار الحرج. الإبقاء على مراجعات أسبوعية للتقدّم حتى يعود SPI إلى ≥ 0.97. تأجيل أي أوامر تغيير غير حرجة ريثما تتعافى وفرة الجدول.
`.trim();

  return { en, ar };
}

function selectBrief(input: ComposeBriefInput): { en: string; ar: string } {
  switch (input.subject) {
    case "contract_management":
      return contractBrief(input);
    case "tender_evaluation":
      return tenderBrief(input);
    case "operations_maintenance":
      return opsBrief(input);
    case "construction":
      return constructionBrief(input);
  }
}

export function composeBrief(input: ComposeBriefInput): {
  text_en: string;
  text_ar: string;
  audience_label_en: string;
  audience_label_ar: string;
} {
  const supported = reviewedFacts(input.facts, input.documentTexts ?? {});
  const { en, ar } = supported ? {
    en: "## Locally reviewed source claims\n\n" + input.facts.map(f => `- ${f.fact_type}: ${JSON.stringify(f.payload_json)}\n  Source ${f.document_id}: ${f.citation_quote}`).join("\n\n") + "\n\nHuman-reviewed locally; not authenticated organizational approval. No operational recommendation is generated.",
    ar: "## ادعاءات المصادر المراجعة محلياً\n\n" + input.facts.map(f => `- ${f.fact_type}: ${JSON.stringify(f.payload_json)}\n  المصدر ${f.document_id}: ${f.citation_quote}`).join("\n\n") + "\n\nمراجعة بشرية محلية وليست اعتماداً مؤسسياً موثقاً. لم تُنتج توصيات تشغيلية.",
  } : selectBrief(input);
  const label = AUDIENCE_LABEL[input.audience];
  return {
    text_en: supported ? en : "DEMO / UNVERIFIED DRAFT — illustrative content, not findings or advice from your documents. Do not use for decisions or publish as evidence.\n\n" + en,
    text_ar: supported ? ar : "مسودة تجريبية غير متحققة — محتوى توضيحي وليس نتائج أو توصيات من مستنداتك. لا تستخدم لاتخاذ القرارات أو تنشر كدليل.\n\n" + ar,
    audience_label_en: label.en,
    audience_label_ar: label.ar,
  };
}

export function audienceOptions(): Array<{
  id: BriefAudience;
  label_en: string;
  label_ar: string;
}> {
  return (Object.keys(AUDIENCE_LABEL) as BriefAudience[]).map((id) => ({
    id,
    label_en: AUDIENCE_LABEL[id].en,
    label_ar: AUDIENCE_LABEL[id].ar,
  }));
}
