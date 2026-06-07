"use client";

import { Search, Heart } from "lucide-react";

// ============================================
// 型定義
// ============================================

export interface Filters {
  searchQuery: string;
  isLiked: boolean | null;
  selectedArtist: string;
}

interface SongFilterBarProps {
  filters: Filters;
  artists: string[];
  onFilterChange: (filters: Filters) => void;
}

// ============================================
// コンポーネント
// ============================================

export default function SongFilterBar({
  filters,
  artists,
  onFilterChange,
}: SongFilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* タイトル検索 */}
      <div className="flex items-center gap-2 border border-[#e9e9e7] rounded-md px-2.5 py-1.5 bg-white focus-within:border-[#37352f] transition-colors">
        <Search size={14} className="text-[#9ca3af] flex-shrink-0" />
        <input
          type="text"
          placeholder="タイトル検索..."
          value={filters.searchQuery}
          onChange={(e) =>
            onFilterChange({ ...filters, searchQuery: e.target.value })
          }
          className="bg-transparent border-none outline-none text-[13px] w-44 placeholder-[#d4d4d2] text-[#37352f]"
        />
      </div>

      {/* Like フィルタ */}
      <div className="flex items-center border border-[#e9e9e7] rounded-md overflow-hidden">
        <button
          onClick={() => onFilterChange({ ...filters, isLiked: null })}
          className={`px-3 py-1.5 text-[12px] font-bold transition-colors ${
            filters.isLiked === null ? "bg-[#37352f] text-white" : "bg-white text-[#787774] hover:bg-[#fbfbfa]"
          }`}
        >
          All
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, isLiked: true })}
          className={`px-3 py-1.5 text-[12px] flex items-center gap-1.5 font-bold transition-colors border-l border-[#e9e9e7] ${
            filters.isLiked === true ? "bg-[#37352f] text-white" : "bg-white text-[#787774] hover:bg-[#fbfbfa]"
          }`}
        >
          <Heart size={14} fill={filters.isLiked === true ? "currentColor" : "none"} className={filters.isLiked === true ? "text-pink-500" : "opacity-40"} />
          Like
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, isLiked: false })}
          className={`px-3 py-1.5 text-[12px] flex items-center gap-1.5 font-bold transition-colors border-l border-[#e9e9e7] ${
            filters.isLiked === false ? "bg-[#37352f] text-white" : "bg-white text-[#787774] hover:bg-[#fbfbfa]"
          }`}
        >
          <Heart size={14} className="opacity-40" />
          Unliked
        </button>
      </div>

      {/* アーティストフィルタ */}
      <select
        value={filters.selectedArtist}
        onChange={(e) =>
          onFilterChange({ ...filters, selectedArtist: e.target.value })
        }
        className="border border-[#e9e9e7] rounded-md px-2.5 py-1.5 text-[12px] bg-white text-[#37352f] cursor-pointer outline-none hover:border-[#d4d4d2] transition-colors"
      >
        <option value="">アーティスト: All</option>
        {artists.map((artist) => (
          <option key={artist} value={artist}>
            {artist}
          </option>
        ))}
      </select>
    </div>
  );
}
