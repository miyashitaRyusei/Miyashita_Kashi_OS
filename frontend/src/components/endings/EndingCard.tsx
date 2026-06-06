"use client";

import { useState } from "react";
import { ChevronRight, Hash, Heart, Trash2 } from "lucide-react";
import type { SentenceEnding } from "@/types";
import { updateDictionaryPreference } from "@/lib/api";

interface EndingCardProps {
  ending: SentenceEnding;
  onRemove?: () => void;
}

export default function EndingCard({ ending, onRemove }: EndingCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(ending.is_favorite || false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // アコーディオンの開閉を防ぐ
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
    <div className="border border-[#e9e9e7] rounded-lg overflow-hidden bg-white hover:border-[#d4d4d2] transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            size={16}
            className={`text-[#9ca3af] transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          <span className="text-[16px] font-bold text-[#37352f]">
            「{ending.ending_text}」
          </span>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
            {ending.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-[12px] text-[#787774] mr-2">
            <Hash size={12} />
            {ending.appearance_count}回
          </span>
          <div
            onClick={handleFavorite}
            className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${isFavorite ? 'text-red-500' : 'text-[#d4d4d2]'}`}
            title="お気に入り"
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </div>
          <div
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-gray-100 text-[#d4d4d2] hover:text-red-500 transition-colors"
            title="非表示にする"
          >
            <Trash2 size={14} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[#e9e9e7] bg-[#fbfbfa] p-4">
          <h4 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
            使用例
          </h4>
          {ending.examples && ending.examples.length > 0 ? (
            <ul className="space-y-1.5">
              {ending.examples.map((ex, i) => (
                <li key={i} className="text-[13px] text-[#37352f] flex items-start gap-2">
                  <span className="text-[#d4d4d2] mt-0.5">•</span>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[12px] text-[#c4c4c2]">使用例がありません</div>
          )}
        </div>
      )}
    </div>
  );
}
