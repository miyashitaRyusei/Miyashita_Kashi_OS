/**
 * export.ts — LLMエクスポート用のフォーマット関数
 *
 * 楽曲の解析データを Markdown / JSON 形式に変換し、
 * LLMに貼り付けやすい形でクリップボードにコピーするための関数群。
 */

import type { Song } from "@/types";
import type { SongWithDetails, SectionWithDetails } from "./api";

// ============================================
// 定数（ラベルマッピング）
// ============================================

const COLLOQUIAL_LABELS: Record<string, string> = {
  colloquial: "口語",
  intermediate: "中間",
  poetic: "詩的",
};

const ABSTRACT_LABELS: Record<number, string> = {
  1: "抽象的",
  2: "やや抽象的",
  3: "やや具象的",
  4: "具象的",
};

// ============================================
// Markdown フォーマット
// ============================================

/** 単一楽曲の解析データを Markdown 形式に変換する */
export function formatSongAsMarkdown(song: SongWithDetails): string {
  const lines: string[] = [];

  // --- ヘッダー ---
  lines.push(`# 「${song.title}」 / ${song.artist}`);
  lines.push("");

  // --- メタデータ ---
  lines.push("| 項目 | 値 |");
  lines.push("|------|-----|");
  if (song.sentiment_score !== null) {
    lines.push(`| 感情極性 | ${song.sentiment_score} |`);
  }
  if (song.abstract_balance_score !== null) {
    const label = ABSTRACT_LABELS[song.abstract_balance_score] || "";
    lines.push(
      `| 抽象/具体 | ${song.abstract_balance_score}/4 (${label}) |`
    );
  }
  if (song.colloquial_level) {
    const label = COLLOQUIAL_LABELS[song.colloquial_level] || song.colloquial_level;
    lines.push(`| 口語度 | ${label} |`);
  }
  if (song.information_density !== null) {
    lines.push(`| 情報密度 | ${song.information_density} |`);
  }
  lines.push("");

  // --- セクション ---
  if (song.sections && song.sections.length > 0) {
    for (const section of song.sections) {
      lines.push(formatSectionAsMarkdown(section));
    }
  }

  return lines.join("\n");
}

/** セクションの解析データを Markdown 形式に変換する */
function formatSectionAsMarkdown(section: SectionWithDetails): string {
  const lines: string[] = [];

  // セクションヘッダー
  lines.push(
    `## [${section.section_type}] (総モーラ: ${section.total_mora})`
  );
  lines.push("");

  // 密度サマリー
  lines.push("**密度:**");
  lines.push(
    `名詞=${section.noun_density ?? "-"} / 動詞=${section.verb_density ?? "-"} / 形容詞=${section.adj_density ?? "-"} / 副詞=${section.adv_density ?? "-"} / 内容語=${section.content_word_density ?? "-"}`
  );
  lines.push("");

  // 行単位の対訳テーブル
  if (section.lines && section.lines.length > 0) {
    lines.push("| # | 歌詞 | 散文翻訳 | モーラ | 末尾母音 |");
    lines.push("|---|------|---------|-------|---------|");
    for (const line of section.lines) {
      const prose = line.prose_text || "—";
      const vowel = line.end_vowel?.toUpperCase() || "—";
      lines.push(
        `| ${line.line_number} | ${line.text} | ${prose} | ${line.mora_count} | ${vowel} |`
      );
    }
    lines.push("");
  }

  // レトリック
  if (section.rhetoric && section.rhetoric.length > 0) {
    lines.push("### レトリック");
    for (const r of section.rhetoric) {
      lines.push(`- **${r.type}**: 「${r.phrase}」 — ${r.reason || ""}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** 複数楽曲を1つの Markdown にまとめる */
export function formatSongsAsMarkdown(songs: SongWithDetails[]): string {
  return songs.map((s) => formatSongAsMarkdown(s)).join("\n---\n\n");
}

// ============================================
// 好み分析プロンプト (Prompt Format)
// ============================================

/** 複数楽曲の数値データのみを抽出し、AIに好み分析を依頼するプロンプトを生成する */
export function formatPreferencePrompt(songs: Song[]): string {
  const lines: string[] = [];

  // --- システムプロンプト・指示文 ---
  lines.push("# 指示");
  lines.push("あなたはプロの音楽プロデューサー・作詞家です。");
  lines.push("以下のデータは、私が好んで作成・収集した歌詞の「定量分析データ」です。");
  lines.push("このデータから、私の作詞における傾向や世界観、言葉遣いの好みを分析し、私がどのようなクリエイターなのかを言語化してください。");
  lines.push("");

  // --- 評価指標の説明 ---
  lines.push("# 評価指標の説明");
  lines.push("- **感情 (Sentiment)**: マイナス(悲哀・絶望) 〜 プラス(歓喜・高揚)");
  lines.push("- **視点 (Perspective)**: マイナス(ミクロ・個人的) 〜 プラス(マクロ・俯瞰的)");
  lines.push("- **物語 (Narrative)**: マイナス(叙情・感情表現) 〜 プラス(物語・ストーリー展開)");
  lines.push("- **皮肉 (Cynicism)**: マイナス(純粋・ストレート) 〜 プラス(ひねくれ・皮肉)");
  lines.push("- **抽象/具体 (Abstract/Concrete)**: 1(抽象的・概念的) 〜 4(具象的・風景描写)");
  lines.push("- **情報密度 (Density)**: 1文字あたりの内容語（名詞・動詞等）の多さ。高いほど意味が詰まっている。");
  lines.push("- **口語度 (Colloquial)**: poetic(詩的), intermediate(中間), colloquial(口語)");
  lines.push("");

  // --- データテーブル ---
  lines.push("# 分析データ");
  lines.push("| タイトル | アーティスト | 感情 | 視点 | 物語 | 皮肉 | 抽象/具体 | 密度 | 口語度 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");

  for (const song of songs) {
    const title = song.title || "—";
    const artist = song.artist || "—";
    const sentiment = song.sentiment_score !== null ? song.sentiment_score.toFixed(2) : "—";
    const perspective = song.perspective_score !== null ? song.perspective_score.toFixed(2) : "—";
    const narrative = song.narrative_score !== null ? song.narrative_score.toFixed(2) : "—";
    const cynicism = song.cynicism_score !== null ? song.cynicism_score.toFixed(2) : "—";
    const abstract = song.abstract_balance_score !== null ? song.abstract_balance_score.toString() : "—";
    const density = song.information_density !== null ? song.information_density.toFixed(3) : "—";
    const colloquial = song.colloquial_level || "—";

    lines.push(`| ${title} | ${artist} | ${sentiment} | ${perspective} | ${narrative} | ${cynicism} | ${abstract} | ${density} | ${colloquial} |`);
  }

  return lines.join("\n");
}

// ============================================
// JSON フォーマット
// ============================================

/** 単一楽曲の解析データを整形済み JSON 文字列に変換する */
export function formatSongAsJSON(song: SongWithDetails): string {
  // LLMに渡しやすいように、DBのIDやタイムスタンプを除外した簡潔な構造に変換
  const exportData = {
    title: song.title,
    artist: song.artist,
    metadata: {
      sentiment_score: song.sentiment_score,
      abstract_balance_score: song.abstract_balance_score,
      colloquial_level: song.colloquial_level,
      information_density: song.information_density,
    },
    sections: song.sections?.map((sec) => ({
      section_type: sec.section_type,
      total_mora: sec.total_mora,
      density: {
        noun: sec.noun_density,
        verb: sec.verb_density,
        adj: sec.adj_density,
        adv: sec.adv_density,
        content_word: sec.content_word_density,
      },
      lines: sec.lines?.map((line) => ({
        number: line.line_number,
        text: line.text,
        prose: line.prose_text,
        mora: line.mora_count,
        end_vowel: line.end_vowel,
      })),
      rhetoric: sec.rhetoric?.map((r) => ({
        type: r.type,
        phrase: r.phrase,
        reason: r.reason,
      })),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/** 複数楽曲を1つの JSON 配列に変換する */
export function formatSongsAsJSON(songs: SongWithDetails[]): string {
  const exportArray = songs.map((song) => JSON.parse(formatSongAsJSON(song)));
  return JSON.stringify(exportArray, null, 2);
}

// ============================================
// クリップボード操作
// ============================================

/** テキストをクリップボードにコピーする */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("クリップボードへのコピーに失敗しました:", err);
    // フォールバック: execCommand
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
