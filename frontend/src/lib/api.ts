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
} from "@/types";

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
