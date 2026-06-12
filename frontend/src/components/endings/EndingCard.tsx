"use client";

import { useState } from "react";
import { Hash, Heart, Trash2 } from "lucide-react";
import type { SentenceEnding } from "@/types";
import { updateDictionaryPreference } from "@/lib/api";

interface EndingCardProps {
  ending: SentenceEnding;
  onRemove?: () => void;
}

const CATEGORY_COLORS = [
  "bg-red-50 text-red-600 border-red-200",
  "bg-orange-50 text-orange-600 border-orange-200",
  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "bg-blue-50 text-blue-600 border-blue-200",
  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "bg-purple-50 text-purple-600 border-purple-200",
  "bg-pink-50 text-pink-600 border-pink-200",
];

function getCategoryColor(category: string | null) {
  if (!category) return "bg-gray-100 text-gray-600 border-gray-200";
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

export default function EndingCard({ ending, onRemove }: EndingCardProps) {
  const [isFavorite, setIsFavorite] = useState(ending.is_favorite || false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      await updateDictionaryPreference('ending', ending.ending_text, nextVal, false);
    } catch (err) {
      console.error(err);
      setIsFavorite(!nextVal);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("この文末表現を非表示にしますか？")) return;
    try {
      await updateDictionaryPreference('ending', ending.ending_text, isFavorite, true);
      if (onRemove) onRemove();
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="border border-[#e9e9e7] rounded-lg overflow-hidden bg-white hover:border-[#d4d4d2] transition-colors p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[16px] font-bold text-[#37352f]">
          「{ending.ending_text}」
        </span>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getCategoryColor(ending.category)}`}>
          {ending.category || "未分類"}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1.5 text-[12px] text-[#787774] mr-2">
          <Hash size={12} />
          {ending.appearance_count}回
        </span>
        <button
          onClick={handleFavorite}
          className={`p-2 sm:p-1.5 rounded hover:bg-gray-100 transition-colors ${isFavorite ? 'text-red-500' : 'text-[#d4d4d2]'}`}
          title="お気に入り"
        >
          <Heart size={18} className="sm:w-[14px] sm:h-[14px]" fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 sm:p-1.5 rounded hover:bg-gray-100 text-[#d4d4d2] hover:text-red-500 transition-colors"
          title="非表示にする"
        >
          <Trash2 size={18} className="sm:w-[14px] sm:h-[14px]" />
        </button>
      </div>
    </div>
  );
}
