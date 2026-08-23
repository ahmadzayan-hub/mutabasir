import type { ThemeId } from "@/lib/themes/types";

export type Subject =
  | "contract_management"
  | "tender_evaluation"
  | "operations_maintenance"
  | "construction";

export type BriefAudience =
  | "director"
  | "ceo"
  | "board"
  | "internal_team"
  | "external_client";

export type RagStatus = "green" | "amber" | "red" | "draft";

export type DocumentType =
  | "contract"
  | "monthly_progress_report"
  | "bafo"
  | "meeting_minutes"
  | "invoice"
  | "technical_note"
  | "tender_submission"
  | "evaluation_criteria"
  | "maintenance_log"
  | "sla_report"
  | "work_order"
  | "construction_drawing"
  | "site_progress"
  | "safety_report"
  | "unknown";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface DbProject {
  id: string;
  owner_id: string;
  name: string;
  subject: Subject;
  theme: ThemeId;
  client_authority_en: string | null;
  client_authority_ar: string | null;
  counterparty_en: string | null;
  counterparty_ar: string | null;
  start_date: string | null;
  end_date: string | null;
  status: RagStatus;
  created_at: string;
  updated_at: string;
}

export interface DbDocument {
  id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  document_type: DocumentType;
  classification_confidence: Confidence | null;
  uploaded_by: string;
  created_at: string;
}

export interface DbExtractedFact {
  id: string;
  document_id: string;
  project_id: string;
  fact_type: string;
  payload_json: Record<string, unknown>;
  citation_page: number | null;
  citation_quote: string | null;
  confidence: Confidence;
  user_verified: boolean;
  /** EvidenceObject minted for this fact (docs/contracts/evidence-object.schema.json). */
  evidence_id?: string | null;
  /**
   * Payload keys whose value does not appear in `citation_quote`.
   * Derived at read time by `anchorFacts`, never stored: it is a statement
   * about this pairing of claim and citation, so it must be recomputed
   * whenever either changes rather than cached and trusted.
   */
  unsupported_claims?: string[];
  created_at: string;
}

export interface DbBrief {
  id: string;
  project_id: string;
  author_id: string;
  text_en: string;
  audience: BriefAudience;
  created_at: string;
}

export interface DbSnapshot {
  id: string;
  project_id: string;
  brief_id: string | null;
  composition_json: Record<string, unknown>;
  quality_gate_json: Record<string, unknown> | null;
  rendered_html: string | null;
  pdf_storage_path: string | null;
  share_token: string | null;
  published: boolean;
  override_note: string | null;
  created_by: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  preferred_locale: "en" | "ar";
  created_at: string;
}
