"use client";

import { Search } from "lucide-react";

// ============================================
// 型定義
// ============================================

export interface Filters {
  artist: string;
  isLiked: boolean | null;
  colloquialLevel: string;
}

interface SongFilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

// ============================================
// コンポーネント
// ============================================

export default function SongFilterBar({
  filters,
  onFilterChange,
}: SongFilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* アーティスト / タイトル検索 */}
      <div className="flex items-center gap-2 border border-[#e9e9e7] rounded-md px-2.5 py-1.5 bg-white focus-within:border-[#37352f] transition-colors">
        <Search size={14} className="text-[#9ca3af] flex-shrink-0" />
        <input
          type="text"
          placeholder="タイトル・アーティスト検索..."
          value={filters.artist}
          onChange={(e) =>
            onFilterChange({ ...filters, artist: e.target.value })
          }
          className="bg-transparent border-none outline-none text-[13px] w-44 placeholder-[#d4d4d2] text-[#37352f]"
        />
      </div>

      {/* Like フィルタ（セグメントコントロール） */}
      <div className="flex items-center border border-[#e9e9e7] rounded-md overflow-hidden">
        {[
          { value: null, label: "All" },
          { value: true, label: "❤️ Like" },
          { value: false, label: "🤍" },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() =>
              onFilterChange({ ...filters, isLiked: opt.value as boolean | null })
            }
            className={`px-2.5 py-1.5 text-[12px] transition-colors ${
              filters.isLiked === opt.value
                ? "bg-[#37352f] text-white"
                : "bg-white text-[#787774] hover:bg-[#efefed]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 口語度フィルタ */}
      <select
        value={filters.colloquialLevel}
        onChange={(e) =>
          onFilterChange({ ...filters, colloquialLevel: e.target.value })
        }
        className="border border-[#e9e9e7] rounded-md px-2.5 py-1.5 text-[12px] bg-white text-[#37352f] cursor-pointer outline-none hover:border-[#d4d4d2] transition-colors"
      >
        <option value="">口語度: All</option>
        <option value="colloquial">🗣️ 口語</option>
        <option value="intermediate">📝 中間</option>
        <option value="poetic">✨ 詩的</option>
      </select>
    </div>
  );
}
