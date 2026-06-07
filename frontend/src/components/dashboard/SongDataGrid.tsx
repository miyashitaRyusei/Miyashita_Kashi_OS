"use client";

import { useRouter } from "next/navigation";
import { Music, Trash2 } from "lucide-react";
import type { Song } from "@/types";

// ============================================
// 定数
// ============================================

const COLLOQUIAL_BADGE: Record<string, { text: string; color: string }> = {
  colloquial: { text: "口語", color: "bg-orange-50 text-orange-600 border-orange-200" },
  intermediate: { text: "中間", color: "bg-blue-50 text-blue-600 border-blue-200" },
  poetic: { text: "詩的", color: "bg-purple-50 text-purple-600 border-purple-200" },
};

// ============================================
// Props
// ============================================

interface SongDataGridProps {
  songs: Song[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string, isLiked: boolean) => void;
}

// ============================================
// コンポーネント
// ============================================

export default function SongDataGrid({
  songs,
  selectedIds,
  onSelectionChange,
  onDelete,
  onToggleLike,
}: SongDataGridProps) {
  const router = useRouter();

  const allSelected =
    songs.length > 0 && songs.every((s) => selectedIds.has(s.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(songs.map((s) => s.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const sentimentDisplay = (score: number | null | undefined) => {
    if (typeof score !== 'number') return { text: "—", cls: "text-[#d4d4d2]" };
    const sign = score > 0 ? "+" : "";
    const color =
      score > 0.3
        ? "bg-emerald-50 text-emerald-700"
        : score < -0.3
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
    return {
      text: `${sign}${score.toFixed(1)}`,
      cls: `px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`,
    };
  };

  return (
    <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
      <table className="w-full text-[13px] text-left">
        <thead className="text-[11px] text-[#787774] border-b border-[#e9e9e7] bg-[#fbfbfa] uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border-[#d4d4d2] cursor-pointer accent-[#37352f]"
              />
            </th>
            <th className="px-3 py-2.5 font-medium">タイトル</th>
            <th className="px-3 py-2.5 font-medium">アーティスト</th>
            <th className="px-3 py-2.5 font-medium text-center">感情</th>
            <th className="px-3 py-2.5 font-medium text-center">抽象/具体</th>
            <th className="px-3 py-2.5 font-medium text-center">視点</th>
            <th className="px-3 py-2.5 font-medium text-center">物語性</th>
            <th className="px-3 py-2.5 font-medium text-center">皮肉度</th>
            <th className="px-3 py-2.5 font-medium text-center">口語度</th>
            <th className="px-3 py-2.5 font-medium text-center">密度</th>
            <th className="px-3 py-2.5 font-medium text-center">Like</th>
            <th className="px-3 py-2.5 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {songs.length > 0 ? (
            songs.map((song, i) => {
              const sentiment = sentimentDisplay(song.sentiment_score);
              return (
                <tr
                  key={song.id || `song-${i}`}
                  onClick={() => song.id && router.push(`/songs/${song.id}`)}
                  className="border-b border-[#e9e9e7] last:border-0 hover:bg-[#fbfbfa] transition-colors group cursor-pointer"
                >
                  {/* チェックボックス */}
                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={song.id ? selectedIds.has(song.id) : false}
                      onChange={() => song.id && handleSelectOne(song.id)}
                      className="rounded border-[#d4d4d2] cursor-pointer accent-[#37352f]"
                    />
                  </td>

                  {/* タイトル */}
                  <td className="px-3 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <Music size={14} className="text-[#d4d4d2] flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{song.title || "不明"}</span>
                    </div>
                  </td>

                  {/* アーティスト */}
                  <td className="px-3 py-2.5 text-[#787774]">{song.artist || "不明"}</td>

                  {/* 感情極性 */}
                  <td className="px-3 py-2.5 text-center">
                    <span className={sentiment.cls}>{sentiment.text}</span>
                  </td>

                  {/* 抽象/具体 ドットインジケーター */}
                  <td className="px-3 py-2.5 text-center">
                    {typeof song.abstract_balance_score === 'number' ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4].map((dot) => (
                          <div
                            key={dot}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              dot <= (song.abstract_balance_score ?? 0)
                                ? "bg-[#37352f]"
                                : "bg-[#e9e9e7]"
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#d4d4d2]">—</span>
                    )}
                  </td>

                  {/* 新しいスコア */}
                  <td className="px-3 py-2.5 text-center text-[#787774] font-mono text-[11px]">
                    {typeof song.perspective_score === 'number' ? song.perspective_score.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#787774] font-mono text-[11px]">
                    {typeof song.narrative_score === 'number' ? song.narrative_score.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#787774] font-mono text-[11px]">
                    {typeof song.cynicism_score === 'number' ? song.cynicism_score.toFixed(2) : "—"}
                  </td>

                  {/* 口語度バッジ */}
                  <td className="px-3 py-2.5 text-center">
                    {song.colloquial_level ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          COLLOQUIAL_BADGE[song.colloquial_level]?.color ||
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {COLLOQUIAL_BADGE[song.colloquial_level]?.text ||
                          song.colloquial_level}
                      </span>
                    ) : (
                      <span className="text-[#d4d4d2]">—</span>
                    )}
                  </td>

                  {/* 情報密度 */}
                  <td className="px-3 py-2.5 text-center font-mono text-[12px]">
                    {typeof song.information_density === 'number'
                      ? song.information_density.toFixed(4)
                      : "—"}
                  </td>

                  {/* Like トグル */}
                  <td
                    className="px-3 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onToggleLike(song.id, !song.is_liked)}
                      className="text-lg hover:scale-110 transition-transform"
                    >
                      {song.is_liked ? "❤️" : "🤍"}
                    </button>
                  </td>

                  {/* 削除 */}
                  <td
                    className="px-3 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onDelete(song.id)}
                      className="text-[#d4d4d2] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-12 text-center text-[#9ca3af]"
              >
                楽曲データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
