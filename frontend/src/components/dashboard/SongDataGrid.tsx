"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Music, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Heart } from "lucide-react";
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

type SortKey = keyof Song | null;
type SortOrder = "asc" | "desc";

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
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const allSelected =
    songs.length > 0 && songs.length === selectedIds.size;

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

  const handleSort = (key: keyof Song) => {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedSongs = useMemo(() => {
    if (!sortKey) return songs;
    return [...songs].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [songs, sortKey, sortOrder]);

  const SortIcon = ({ columnKey }: { columnKey: keyof Song }) => {
    if (sortKey !== columnKey) return <ArrowUpDown size={12} className="text-[#d4d4d2] opacity-0 group-hover:opacity-100 transition-opacity ml-1 inline-block" />;
    if (sortOrder === "asc") return <ArrowUp size={12} className="text-[#37352f] ml-1 inline-block" />;
    return <ArrowDown size={12} className="text-[#37352f] ml-1 inline-block" />;
  };

  const scoreBadge = (score: number | null | undefined, reverseColor: boolean = false) => {
    if (typeof score !== 'number') return { text: "—", cls: "text-[#d4d4d2]" };
    const sign = score > 0 ? "+" : "";
    
    let color = "bg-amber-50 text-amber-700 border-amber-200";
    if (score > 0.3) {
      color = reverseColor ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200";
    } else if (score < -0.3) {
      color = reverseColor ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200";
    }

    return {
      text: `${sign}${score.toFixed(2)}`,
      cls: `px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${color} inline-block min-w-[38px] text-center`,
    };
  };

  return (
    <div className="border border-[#e9e9e7] rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-[13px] text-left whitespace-nowrap">
        <thead className="sticky top-0 z-10 bg-[#fbfbfa] text-[11px] text-[#787774] border-b border-[#e9e9e7] shadow-sm uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border-[#d4d4d2] cursor-pointer accent-[#37352f]"
              />
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("title")}
            >
              <div className="flex items-center justify-center gap-1" title="楽曲のタイトル">
                タイトル <SortIcon columnKey="title" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("artist")}
            >
              <div className="flex items-center justify-center gap-1" title="アーティスト名">
                アーティスト <SortIcon columnKey="artist" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("sentiment_score")}
            >
              <div className="flex items-center justify-center gap-1" title="マイナス: 絶望・悲哀 〜 プラス: 歓喜・高揚">
                感情 <SortIcon columnKey="sentiment_score" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("abstract_balance_score")}
            >
              <div className="flex items-center justify-center gap-1" title="1(少ない): 抽象的・概念的 〜 4(多い): 具象的・風景描写">
                抽象/具体 <SortIcon columnKey="abstract_balance_score" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("perspective_score")}
            >
              <div className="flex items-center justify-center gap-1" title="マイナス: ミクロ(自分の半径1m) 〜 プラス: マクロ(社会や宇宙)">
                視点 <SortIcon columnKey="perspective_score" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("narrative_score")}
            >
              <div className="flex items-center justify-center gap-1" title="マイナス: 叙情的(一瞬の情景) 〜 プラス: ストーリー(起承転結が明確)">
                物語性 <SortIcon columnKey="narrative_score" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("cynicism_score")}
            >
              <div className="flex items-center justify-center gap-1" title="マイナス: 純粋・ストレート 〜 プラス: 皮肉・自嘲的・ひねくれ">
                皮肉度 <SortIcon columnKey="cynicism_score" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("colloquial_level")}
            >
              <div className="flex items-center justify-center gap-1" title="言葉遣いの口語度（口語 / 中間 / 詩的）">
                口語度 <SortIcon columnKey="colloquial_level" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("information_density")}
            >
              <div className="flex items-center justify-center gap-1" title="歌詞全体の文字数に対する自立語の割合（密度）">
                密度 <SortIcon columnKey="information_density" />
              </div>
            </th>
            <th 
              className="px-3 py-2.5 font-medium cursor-pointer group hover:text-[#37352f]"
              onClick={() => handleSort("is_liked")}
            >
              <div className="flex items-center justify-center gap-1" title="お気に入り登録した曲">
                Like <SortIcon columnKey="is_liked" />
              </div>
            </th>
            <th className="px-3 py-2.5 w-12 text-center"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {sortedSongs.length > 0 ? (
            sortedSongs.map((song, i) => {
              const sentiment = scoreBadge(song.sentiment_score);
              const perspective = scoreBadge(song.perspective_score);
              const narrative = scoreBadge(song.narrative_score);
              const cynicism = scoreBadge(song.cynicism_score, true); // 皮肉度はプラス（ひねくれ）が青系になる

              return (
                <tr
                  key={song.id || `song-${i}`}
                  onClick={() => song.id && router.push(`/songs/${song.id}`)}
                  className="border-b border-[#e9e9e7] last:border-0 hover:bg-[#fbfbfa] transition-colors group cursor-pointer"
                >
                  {/* チェックボックス */}
                  <td
                    className="px-3 py-2.5 text-center"
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
                      <span className="truncate max-w-[160px]">{song.title || "不明"}</span>
                    </div>
                  </td>

                  {/* アーティスト */}
                  <td className="px-3 py-2.5 text-[#787774] truncate max-w-[120px]">{song.artist || "不明"}</td>

                  {/* 各種スコア */}
                  <td className="px-3 py-2.5 text-center"><span className={sentiment.cls}>{sentiment.text}</span></td>
                  
                  {/* 抽象/具体（ドット） */}
                  <td className="px-3 py-2.5 text-center">
                    {typeof song.abstract_balance_score === 'number' ? (
                      <div className="flex items-center justify-center gap-0.5" title={song.abstract_balance_score.toFixed(2)}>
                        {[1, 2, 3, 4].map((dot) => (
                          <div
                            key={dot}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              dot <= Math.round(song.abstract_balance_score ?? 0)
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

                  <td className="px-3 py-2.5 text-center"><span className={perspective.cls}>{perspective.text}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className={narrative.cls}>{narrative.text}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className={cynicism.cls}>{cynicism.text}</span></td>

                  {/* 口語度バッジ */}
                  <td className="px-3 py-2.5 text-center">
                    {song.colloquial_level ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          COLLOQUIAL_BADGE[song.colloquial_level]?.color ||
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {COLLOQUIAL_BADGE[song.colloquial_level]?.text || song.colloquial_level}
                      </span>
                    ) : (
                      <span className="text-[#d4d4d2]">—</span>
                    )}
                  </td>

                  {/* 情報密度 */}
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] text-[#787774]">
                    {typeof song.information_density === 'number'
                      ? song.information_density.toFixed(3)
                      : "—"}
                  </td>

                  {/* Like トグル */}
                  <td
                    className="px-3 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onToggleLike(song.id, !song.is_liked)}
                      className="text-base hover:scale-110 transition-transform"
                    >
                      {song.is_liked ? <Heart size={16} fill="currentColor" className="text-pink-500" /> : <Heart size={16} className="text-[#d4d4d2]" />}
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
                colSpan={12}
                className="px-4 py-16 text-center text-[#9ca3af]"
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
