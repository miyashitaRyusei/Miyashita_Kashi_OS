export type SectionType = '1A' | '1B' | '1C' | 'Chorus' | 'Bridge' | 'Outro' | (string & {});

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  sentiment_score: number | null;
  abstract_balance_score: number | null; // 旧: 具象度
  information_density: number | null;
  colloquial_level: 'colloquial' | 'intermediate' | 'poetic' | null;
  timeline: string | null;
  analysis_status: 'processing' | 'completed' | 'error';
  is_liked: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  song_id: string;
  section_type: SectionType;
  total_mora: number;
  sentiment_score: number | null;
  noun_density: number | null;
  verb_density: number | null;
  adj_density: number | null;
  adv_density: number | null;
  content_word_density: number | null;
  order_index: number;
  created_at: string;
}

export interface Line {
  id: string;
  section_id: string;
  line_number: number;
  text: string;
  mora_count: number;
  end_vowel: string | null;
  prose_text: string | null;  // Geminiによる散文翻訳
  created_at: string;
}

export interface SentenceEnding {
  id: string;
  ending_text: string;
  category: string | null;
  appearance_count: number;
  examples: string[];
  created_at: string;
}

export interface LyricRule {
  id: string;
  rule_name: string;
  is_novel: boolean;
  examples: string[] | null;
  created_at: string;
}

export interface Rhetoric {
  id: string;
  section_id: string;
  type: string;
  phrase: string;
  reason: string | null;
  created_at: string;
}
