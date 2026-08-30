/**
 * api.ts — 型安全な API クライアント
 *
 * バックエンド (FastAPI) との通信を一元管理する。
 * Phase 1 で定義した types/index.ts の型を使い、
 * 全ての fetch 呼び出しに型安全性を持たせる。
 */

import type {
  Song,
  Section,
  Line,
  SentenceEnding,
  LyricRule,
  Rhetoric,
  LyricPhrase,
  LyricDraft,
  IdeaSeed,
} from "@/types";
import type {
  ReferenceTier,
  ResearchAnalysisV02,
  ResearchItem,
  SongResearchAnalysis,
} from "@/types/research";

// ============================================
// 定数
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================
// ネストされた詳細型（API レスポンス用）
// ============================================

/** Section + 子要素 (lines, rhetoric) を含むネスト型 */
export interface SectionWithDetails extends Section {
  lines: Line[];
  rhetoric: Rhetoric[];
}

/** Song + 子要素 (sections) を含むネスト型 */
export interface SongWithDetails extends Song {
  sections: SectionWithDetails[];
}

/** 解析リクエストのペイロード */
export interface AnalyzeRequest {
  title: string;
  artist: string;
  sections: { section_name: string; lyrics_raw: string }[];
}

// ============================================
// 汎用 fetch ラッパー
// ============================================

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

// ============================================
// Songs API
// ============================================

/** 全楽曲の一覧を取得する */
export async function fetchSongs(): Promise<Song[]> {
  const data = await fetchAPI<{ songs: Song[] }>("/api/songs");
  return data.songs;
}

/** 特定の楽曲を詳細データ（sections, lines, rhetoric 含む）付きで取得する */
export async function fetchSongById(id: string): Promise<SongWithDetails> {
  return fetchAPI<SongWithDetails>(`/api/songs/${id}`);
}

/** 楽曲を削除する */
export async function deleteSong(id: string): Promise<void> {
  await fetchAPI<{ success: boolean }>(`/api/songs/${id}`, {
    method: "DELETE",
  });
}

/** 楽曲の Like 状態を更新する */
export async function updateSongLike(
  id: string,
  isLiked: boolean
): Promise<void> {
  await fetchAPI<{ success: boolean }>(`/api/songs/${id}/like`, {
    method: "PATCH",
    body: JSON.stringify({ is_liked: isLiked }),
  });
}

/** 楽曲のタイトルとアーティスト名を更新する */
export async function updateSongMeta(
  id: string,
  title: string,
  artist: string
): Promise<void> {
  await fetchAPI<{ success: boolean }>(`/api/songs/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, artist }),
  });
}

export async function updateSongReferenceTier(
  id: string,
  referenceTier: ReferenceTier | null
): Promise<Song> {
  const result = await fetchAPI<{ success: boolean; data: Song }>(
    `/api/songs/${id}/reference-tier`,
    {
      method: "PATCH",
      body: JSON.stringify({ reference_tier: referenceTier }),
    }
  );
  return result.data;
}

export interface ResearchValidationResult {
  valid: true;
  analysis: ResearchAnalysisV02;
  derived_item_count: number;
}

export async function validateResearchAnalysis(
  analysisJson: unknown
): Promise<ResearchValidationResult> {
  return fetchAPI<ResearchValidationResult>("/api/research-analyses/validate", {
    method: "POST",
    body: JSON.stringify({ analysis_json: analysisJson, source: "chatgpt" }),
  });
}

export async function fetchActiveResearchAnalysis(
  songId: string
): Promise<SongResearchAnalysis | null> {
  const data = await fetchAPI<{ analysis: SongResearchAnalysis | null }>(
    `/api/songs/${songId}/research-analysis`
  );
  return data.analysis;
}

export async function importResearchAnalysis(
  songId: string,
  analysisJson: ResearchAnalysisV02,
  options?: { promptVersion?: string; modelName?: string }
): Promise<SongResearchAnalysis> {
  const data = await fetchAPI<{ analysis: SongResearchAnalysis }>(
    `/api/songs/${songId}/research-analyses`,
    {
      method: "POST",
      body: JSON.stringify({
        analysis_json: analysisJson,
        source: "chatgpt",
        prompt_version: options?.promptVersion ?? "research-v0.2",
        model_name: options?.modelName ?? null,
      }),
    }
  );
  return data.analysis;
}

export async function fetchResearchItems(params?: {
  songId?: string;
  itemType?: ResearchItem["item_type"];
  isFavorite?: boolean;
}): Promise<ResearchItem[]> {
  const search = new URLSearchParams();
  if (params?.songId) search.set("song_id", params.songId);
  if (params?.itemType) search.set("item_type", params.itemType);
  if (params?.isFavorite !== undefined) search.set("is_favorite", String(params.isFavorite));
  const query = search.toString() ? `?${search}` : "";
  const data = await fetchAPI<{ items: ResearchItem[] }>(`/api/research-items${query}`);
  return data.items;
}


// ============================================
// Analysis API
// ============================================

export interface AnalyzeResponse {
  id: string;
  status: "processing" | "completed" | "error";
}

/** 歌詞を解析する (バックグラウンドタスク起動) */
export async function analyzeLyrics(
  req: AnalyzeRequest
): Promise<AnalyzeResponse> {
  return fetchAPI<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/** 楽曲の解析ステータスを取得する */
export async function getSongStatus(id: string): Promise<{ id: string; analysis_status: string }> {
  return fetchAPI<{ id: string; analysis_status: string }>(`/api/songs/${id}/status`);
}

/** バックエンドを起こしておくためのヘルスチェック */
export async function pingHealthCheck(): Promise<void> {
  try {
    await fetchAPI<{ status: string }>("/api/health");
  } catch (e) {
    console.error("Health check ping failed:", e);
  }
}

// ============================================
// Inline Edit API
// ============================================

/** 行の散文翻訳を更新する */
export async function updateLineProse(lineId: string, proseText: string): Promise<void> {
  await fetchAPI<{ success: boolean }>(`/api/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify({ prose_text: proseText }),
  });
}

/** レトリックの理由等を更新する */
export async function updateRhetoricContent(rhetoricId: string, reason: string): Promise<void> {
  await fetchAPI<{ success: boolean }>(`/api/rhetoric/${rhetoricId}`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

// ============================================
// Sentence Endings API
// ============================================

/** 文末表現を取得する（カテゴリフィルタ対応） */
export async function fetchSentenceEndings(
  category?: string,
  isLiked?: boolean
): Promise<SentenceEnding[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (isLiked !== undefined) params.append("is_liked", String(isLiked));
  const query = params.toString() ? `?${params.toString()}` : "";
  
  const data = await fetchAPI<{ endings: SentenceEnding[] }>(
    `/api/sentence-endings${query}`
  );
  return data.endings;
}

// ============================================
// Lyric Rules API
// ============================================

/** 作詞ルールを取得する */
export async function fetchLyricRules(isLiked?: boolean): Promise<LyricRule[]> {
  const query = isLiked !== undefined ? `?is_liked=${isLiked}` : "";
  const data = await fetchAPI<{ rules: LyricRule[] }>(`/api/lyric-rules${query}`);
  return data.rules;
}

// ============================================
// Lyric Phrases API
// ============================================

/** 書き出し・書き終わりのフレーズを取得する */
export async function fetchLyricPhrases(isLiked?: boolean): Promise<LyricPhrase[]> {
  const query = isLiked !== undefined ? `?is_liked=${isLiked}` : "";
  const data = await fetchAPI<{ phrases: LyricPhrase[] }>(`/api/phrases${query}`);
  return data.phrases;
}

export async function updateDictionaryPreference(
  itemType: 'phrase' | 'rule' | 'ending',
  itemKey: string,
  isFavorite: boolean,
  isDeleted: boolean,
  memo?: string
) {
  const bodyData: any = {
    item_type: itemType,
    item_key: itemKey,
    is_favorite: isFavorite,
    is_deleted: isDeleted,
  };
  if (memo !== undefined) {
    bodyData.memo = memo;
  }

  const res = await fetch(`${API_BASE}/api/dictionary-preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });
  if (!res.ok) throw new Error("Failed to update dictionary preference");
  return res.json();
}

// ============================================
// Drafts API
// ============================================

export async function fetchDrafts(): Promise<LyricDraft[]> {
  const data = await fetchAPI<{ drafts: LyricDraft[] }>("/api/drafts");
  return data.drafts;
}

export async function fetchDraft(draftId: string): Promise<LyricDraft> {
  return await fetchAPI<LyricDraft>(`/api/drafts/${draftId}`);
}

export async function createDraft(title: string, content: string): Promise<LyricDraft> {
  return await fetchAPI<LyricDraft>("/api/drafts", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export async function updateDraft(draftId: string, title: string, content: string): Promise<LyricDraft> {
  return await fetchAPI<LyricDraft>(`/api/drafts/${draftId}`, {
    method: "PUT",
    body: JSON.stringify({ title, content }),
  });
}

export async function deleteDraft(draftId: string): Promise<{ success: boolean }> {
  return await fetchAPI<{ success: boolean }>(`/api/drafts/${draftId}`, {
    method: "DELETE",
  });
}

// ============================================
// Idea Seeds API
// ============================================

export async function fetchIdeaSeeds(): Promise<IdeaSeed[]> {
  const data = await fetchAPI<{ ideas: IdeaSeed[] }>("/api/ideas");
  return data.ideas;
}

export async function createIdeaSeed(content: string, category: string = "単語", memo: string = ""): Promise<IdeaSeed> {
  return await fetchAPI<IdeaSeed>("/api/ideas", {
    method: "POST",
    body: JSON.stringify({ content, category, memo }),
  });
}

export async function updateIdeaSeed(id: string, content: string, category: string, memo: string = ""): Promise<IdeaSeed> {
  return await fetchAPI<IdeaSeed>(`/api/ideas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ content, category, memo }),
  });
}

export async function deleteIdeaSeed(id: string): Promise<{ success: boolean }> {
  return await fetchAPI<{ success: boolean }>(`/api/ideas/${id}`, {
    method: "DELETE",
  });
}
