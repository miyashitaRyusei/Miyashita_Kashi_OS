export const RESEARCH_SCHEMA_VERSION = "0.3" as const;

export type ReferenceTier = "core" | "selected" | "archive";

export type TechniqueCategory =
  | "connection"
  | "modification"
  | "repetition"
  | "viewpoint"
  | "abstraction_move"
  | "wording"
  | "sound"
  | "structure"
  | "rhetoric"
  | "other";

export interface ResearchEvidence {
  quote: string;
  section?: string | null;
  explanation?: string | null;
}

export interface ResearchTechnique {
  name: string;
  category: TechniqueCategory;
  description: string;
  why_it_works: string;
  evidence: ResearchEvidence[];
  reuse_hint: string;
  tags: string[];
}

export interface ResearchExpressionPattern {
  expression: string;
  description: string;
  effect: string;
  evidence: ResearchEvidence[];
  reuse_hint: string;
  tags: string[];
}

export interface ResearchNotablePhrase {
  phrase: string;
  section?: string | null;
  description: string;
  reuse_hint: string;
  tags: string[];
}

export interface ResearchMotifElement {
  text: string;
  section?: string | null;
  note?: string | null;
}

export interface ResearchMotif {
  name: string;
  elements: ResearchMotifElement[];
  development: string;
  shared_principle: string;
  function: string;
}

export interface ResearchTakeaway {
  title: string;
  description: string;
  how_to_use: string;
  avoid_copying: string;
}

export interface ResearchAnalysisV02 {
  schema_version: "0.2";
  song: { id: string; title: string; artist: string };
  summary: { overview: string; key_insights: string[] };
  techniques: ResearchTechnique[];
  expression_patterns: {
    sentence_endings: ResearchExpressionPattern[];
    connections: ResearchExpressionPattern[];
    modifiers: ResearchExpressionPattern[];
    notable_phrases: ResearchNotablePhrase[];
  };
  motifs: ResearchMotif[];
  structure: {
    overview: string;
    repetition_and_variation: string;
    viewpoint_flow: string;
    abstract_concrete_flow: string;
  };
  takeaways: ResearchTakeaway[];
}

export type ConstructionKind = "connection" | "comparison" | "condition" | "negation" | "word_order" | "modification" | "repetition" | "other";

export interface ResearchConstruction {
  expression: string;
  kind: ConstructionKind;
  description: string;
  effect: string;
  evidence: ResearchEvidence[];
  reuse_hint: string;
  tags: string[];
}

export interface ResearchAnalysisV03 {
  schema_version: "0.3";
  song: { id: string; title: string; artist: string };
  techniques: ResearchTechnique[];
  constructions: ResearchConstruction[];
  sentence_endings: ResearchExpressionPattern[];
  phrases: ResearchNotablePhrase[];
}

export type ResearchAnalysis = ResearchAnalysisV02 | ResearchAnalysisV03;

export interface SongResearchAnalysis {
  id: string;
  song_id: string;
  source: "chatgpt" | "manual" | "other";
  schema_version: string;
  title: string;
  analysis_json: ResearchAnalysis;
  prompt_version: string | null;
  model_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ResearchItemType =
  | "summary_insight"
  | "technique"
  | "sentence_ending"
  | "connection"
  | "modifier"
  | "notable_phrase"
  | "motif"
  | "structure"
  | "takeaway";

export interface ResearchItem {
  id: string;
  analysis_id: string;
  song_id: string;
  item_type: ResearchItemType;
  category: string | null;
  title: string;
  content: string;
  effect: string | null;
  reuse_hint: string | null;
  examples: Record<string, unknown>[];
  tags: string[];
  is_favorite: boolean;
  personal_note: string | null;
  created_at: string;
  updated_at: string;
  song_title?: string | null;
  song_artist?: string | null;
  reference_tier?: ReferenceTier | null;
}
