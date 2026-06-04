"use client";

import { useState } from "react";
import { ChevronRight, Hash } from "lucide-react";
import type { SentenceEnding } from "@/types";

interface EndingCardProps {
  ending: SentenceEnding;
}

export default function EndingCard({ ending }: EndingCardProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        <div className="flex items-center gap-1.5 text-[12px] text-[#787774]">
          <Hash size={12} />
          {ending.appearance_count}回
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
